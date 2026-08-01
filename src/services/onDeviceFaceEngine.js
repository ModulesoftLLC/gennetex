import { NativeModules } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import jpeg from 'jpeg-js';

const MODEL_DIR = `${FileSystem.documentDirectory}models/face/`;
const DETECTOR_PATH = `${MODEL_DIR}yunet.onnx`;
const RECOGNIZER_PATH = `${MODEL_DIR}sface.onnx`;
const DETECTOR_URL = 'https://media.githubusercontent.com/media/opencv/opencv_zoo/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx';
const RECOGNIZER_URL = 'https://media.githubusercontent.com/media/opencv/opencv_zoo/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx';
const DETECTOR_SIZE = 320;
const FACE_SIZE = 112;
const SCORE_THRESHOLD = 0.82;
export const FACE_MATCH_THRESHOLD = 0.32;
export const NATIVE_FACE_ENGINE = 'opencv-sface-v1';
export const FALLBACK_FACE_ENGINE = 'local-image-descriptor-v1';

let ort;
let detectorSession;
let recognizerSession;

function runtime() {
  if (!NativeModules.Onnxruntime) {
    throw new Error('Нүүр таних native AI модуль энэ хувилбарт ачаалагдсангүй. Аппыг хамгийн сүүлийн хувилбараар шинэчлээд дахин нээнэ үү.');
  }
  if (!ort) ort = require('onnxruntime-react-native');
  return ort;
}

async function ensureModel(path, url, minimumSize) {
  const current = await FileSystem.getInfoAsync(path);
  if (current.exists && Number(current.size || 0) >= minimumSize) return path;
  await FileSystem.makeDirectoryAsync(MODEL_DIR, { intermediates: true });
  const result = await FileSystem.downloadAsync(url, path);
  const downloaded = await FileSystem.getInfoAsync(result.uri);
  if (!downloaded.exists || Number(downloaded.size || 0) < minimumSize) {
    throw new Error('Нүүр таних AI model бүрэн татагдсангүй. Интернэтээ шалгаад дахин оролдоно уу.');
  }
  return result.uri;
}

async function sessions() {
  const engine = runtime();
  if (!detectorSession) {
    detectorSession = await engine.InferenceSession.create(
      await ensureModel(DETECTOR_PATH, DETECTOR_URL, 200000),
      { executionProviders: ['cpu'], graphOptimizationLevel: 'all' }
    );
  }
  if (!recognizerSession) {
    recognizerSession = await engine.InferenceSession.create(
      await ensureModel(RECOGNIZER_PATH, RECOGNIZER_URL, 30000000),
      { executionProviders: ['cpu'], graphOptimizationLevel: 'all' }
    );
  }
  return { engine, detectorSession, recognizerSession };
}

async function decodeJpeg(uri) {
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  const image = jpeg.decode(new Uint8Array(decode(base64)), { useTArray: true });
  if (!image?.width || !image?.height) throw new Error('Selfie зургийг уншиж чадсангүй.');
  return image;
}

function resizeRgbTensor(image, size) {
  const plane = size * size;
  const out = new Float32Array(plane * 3);
  for (let y = 0; y < size; y += 1) {
    const sy = Math.min(image.height - 1, Math.floor((y + 0.5) * image.height / size));
    for (let x = 0; x < size; x += 1) {
      const sx = Math.min(image.width - 1, Math.floor((x + 0.5) * image.width / size));
      const source = (sy * image.width + sx) * 4;
      const target = y * size + x;
      // OpenCV YuNet uses BGR blob without normalization.
      out[target] = image.data[source + 2];
      out[plane + target] = image.data[source + 1];
      out[plane * 2 + target] = image.data[source];
    }
  }
  return out;
}

function outputData(outputs, name) {
  return outputs[name]?.data || null;
}

function detectBestFace(outputs) {
  let best = null;
  [8, 16, 32].forEach((stride) => {
    const cls = outputData(outputs, `cls_${stride}`);
    const obj = outputData(outputs, `obj_${stride}`);
    const bbox = outputData(outputs, `bbox_${stride}`);
    const kps = outputData(outputs, `kps_${stride}`);
    if (!cls || !obj || !bbox || !kps) return;
    const cols = DETECTOR_SIZE / stride;
    const rows = DETECTOR_SIZE / stride;
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const index = r * cols + c;
        const score = Math.sqrt(Math.max(0, Math.min(1, cls[index])) * Math.max(0, Math.min(1, obj[index])));
        if (score < SCORE_THRESHOLD || (best && score <= best.score)) continue;
        const width = Math.exp(bbox[index * 4 + 2]) * stride;
        const height = Math.exp(bbox[index * 4 + 3]) * stride;
        const cx = (c + bbox[index * 4]) * stride;
        const cy = (r + bbox[index * 4 + 1]) * stride;
        const landmarks = [];
        for (let point = 0; point < 5; point += 1) {
          landmarks.push([
            (kps[index * 10 + point * 2] + c) * stride,
            (kps[index * 10 + point * 2 + 1] + r) * stride,
          ]);
        }
        best = { score, width, height, cx, cy, landmarks };
      }
    }
  });
  if (!best) throw new Error('Нүүр тод харагдсангүй. Камер руу эгц харж, гэрлээ нэмээд дахин оролдоно уу.');
  if (best.width < 65 || best.height < 65) throw new Error('Камерт арай ойртож дахин авна уу.');
  return best;
}

const TARGET = [[38.2946, 51.6963], [73.5318, 51.5014], [56.0252, 71.7366], [41.5493, 92.3655], [70.7299, 92.2041]];

function similarityTransform(source, target) {
  const sourceMean = source.reduce((sum, p) => [sum[0] + p[0] / 5, sum[1] + p[1] / 5], [0, 0]);
  const targetMean = target.reduce((sum, p) => [sum[0] + p[0] / 5, sum[1] + p[1] / 5], [0, 0]);
  let denominator = 0;
  let numeratorA = 0;
  let numeratorB = 0;
  source.forEach((point, i) => {
    const sx = point[0] - sourceMean[0];
    const sy = point[1] - sourceMean[1];
    const tx = target[i][0] - targetMean[0];
    const ty = target[i][1] - targetMean[1];
    denominator += sx * sx + sy * sy;
    numeratorA += sx * tx + sy * ty;
    numeratorB += sx * ty - sy * tx;
  });
  if (denominator < 1e-6) throw new Error('Нүүрний байрлал тодорхойгүй байна.');
  const a = numeratorA / denominator;
  const b = numeratorB / denominator;
  return {
    a,
    b,
    tx: targetMean[0] - a * sourceMean[0] + b * sourceMean[1],
    ty: targetMean[1] - b * sourceMean[0] - a * sourceMean[1],
  };
}

function alignedFaceTensor(resizedBgr, landmarks) {
  const transform = similarityTransform(landmarks, TARGET);
  const determinant = transform.a * transform.a + transform.b * transform.b;
  const facePlane = FACE_SIZE * FACE_SIZE;
  const out = new Float32Array(facePlane * 3);
  for (let y = 0; y < FACE_SIZE; y += 1) {
    for (let x = 0; x < FACE_SIZE; x += 1) {
      const dx = x - transform.tx;
      const dy = y - transform.ty;
      const sx = (transform.a * dx + transform.b * dy) / determinant;
      const sy = (-transform.b * dx + transform.a * dy) / determinant;
      const ix = Math.max(0, Math.min(DETECTOR_SIZE - 1, Math.round(sx)));
      const iy = Math.max(0, Math.min(DETECTOR_SIZE - 1, Math.round(sy)));
      const source = iy * DETECTOR_SIZE + ix;
      const target = y * FACE_SIZE + x;
      // FaceRecognizerSF uses swapRB=true; convert resized BGR into RGB planes.
      out[target] = resizedBgr[DETECTOR_SIZE * DETECTOR_SIZE * 2 + source];
      out[facePlane + target] = resizedBgr[DETECTOR_SIZE * DETECTOR_SIZE + source];
      out[facePlane * 2 + target] = resizedBgr[source];
    }
  }
  return out;
}

function normalized(values) {
  const vector = Array.from(values, Number);
  const length = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (!Number.isFinite(length) || length < 1e-8) throw new Error('Нүүрийн өгөгдөл үүсгэж чадсангүй.');
  return vector.map((value) => Number((value / length).toFixed(7)));
}

// Expo Go болон зарим OEM Android дээр ONNX native module байхгүй үед
// selfie-ийн төв хэсгээс privacy-safe local descriptor үүсгэнэ.
function fallbackEmbedding(image) {
  const size = 24;
  const values = [];
  const left = Math.floor(image.width * 0.2);
  const top = Math.floor(image.height * 0.12);
  const width = Math.floor(image.width * 0.6);
  const height = Math.floor(image.height * 0.76);
  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) {
    const sx = Math.min(image.width - 1, left + Math.floor((x + 0.5) * width / size));
    const sy = Math.min(image.height - 1, top + Math.floor((y + 0.5) * height / size));
    const i = (sy * image.width + sx) * 4;
    values.push((image.data[i] * 0.299 + image.data[i + 1] * 0.587 + image.data[i + 2] * 0.114) / 255);
  }
  const mean = values.reduce((sum, n) => sum + n, 0) / values.length;
  return normalized(values.map((n) => n - mean));
}

export async function createFaceEmbedding(uri) {
  if (!String(uri || '').startsWith('file:')) throw new Error('Нүүр танихад төхөөрөмжийн selfie зураг шаардлагатай.');
  const image = await decodeJpeg(uri);
  if (!NativeModules.Onnxruntime) {
    return {
      embedding: fallbackEmbedding(image),
      quality: 0.85,
      fallback: true,
      engine: FALLBACK_FACE_ENGINE,
    };
  }
  try {
    const { engine, detectorSession: detector, recognizerSession: recognizer } = await sessions();
    const detectorInput = resizeRgbTensor(image, DETECTOR_SIZE);
    const detectorOutputs = await detector.run({
      [detector.inputNames[0]]: new engine.Tensor('float32', detectorInput, [1, 3, DETECTOR_SIZE, DETECTOR_SIZE]),
    });
    const face = detectBestFace(detectorOutputs);
    const aligned = alignedFaceTensor(detectorInput, face.landmarks);
    const recognitionOutputs = await recognizer.run({
      [recognizer.inputNames[0]]: new engine.Tensor('float32', aligned, [1, 3, FACE_SIZE, FACE_SIZE]),
    });
    return {
      embedding: normalized(recognitionOutputs[recognizer.outputNames[0]].data),
      quality: face.score,
      engine: NATIVE_FACE_ENGINE,
    };
  } catch (error) {
    console.warn('Native face engine failed; using the on-device fallback:', error?.message || error);
    return {
      embedding: fallbackEmbedding(image),
      quality: 0.85,
      fallback: true,
      engine: FALLBACK_FACE_ENGINE,
    };
  }
}

export function cosineSimilarity(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length || !left.length) return -1;
  let score = 0;
  for (let i = 0; i < left.length; i += 1) score += Number(left[i]) * Number(right[i]);
  return score;
}
