import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import fallbackPosts from '../../data/posts';
import { fetchBlogPostBySlug } from '../../lib/blogService';
 
 export default function BlogPost() {
   const { slug } = useParams();
   const [post, setPost] = useState(null);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState(null);

   useEffect(() => {
     if (!slug) return;
     fetchBlogPostBySlug(slug)
       .then((result) => {
         if (result) {
           setPost(result);
         } else {
           setPost(fallbackPosts.find((item) => item.slug === slug) || null);
         }
       })
       .catch((err) => {
         console.warn('[blog] fetch post failed', err);
         setError(err);
         setPost(fallbackPosts.find((item) => item.slug === slug) || null);
       })
       .finally(() => setLoading(false));
   }, [slug]);
 
   if (!post) {
     return (
       <div className="px-4 py-12 sm:px-6 md:px-12">
         <h2 className="text-2xl font-semibold text-graphite-50">Нийтлэл олдсонгүй</h2>
         <p className="mt-3 text-graphite-400">Уучлаарай, хүссэн нийтлэл олдсонгүй.</p>
       </div>
     );
   }
 
   return (
     <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 md:px-12 lg:px-16">
       <Link
         to="/blog"
         className="inline-flex items-center gap-2 text-sm font-medium text-graphite-300 transition hover:text-graphite-100"
       >
         ← Блог руу буцах
       </Link>
 
       <article className="mt-8 space-y-8">
         <div className="overflow-hidden rounded-[32px] border border-graphite-800 bg-graphite-900 shadow-[0_40px_120px_rgba(0,0,0,0.18)]">
           <img src={post.featured_image} alt={post.title} className="h-[420px] w-full object-cover" />
         </div>
 
         <div className="space-y-4">
           <p className="text-xs uppercase tracking-[0.32em] text-graphite-400">Блог</p>
           <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">{post.title}</h1>
           <div className="flex flex-wrap gap-4 text-sm text-graphite-400">
             <span>{post.author}</span>
             <span>{post.created_at}</span>
           </div>
         </div>
 
         <div className="space-y-6 text-graphite-200">
           <div dangerouslySetInnerHTML={{ __html: post.content }} />
         </div>
 
         <section className="rounded-[28px] border border-graphite-800 bg-graphite-950/90 p-6">
           <h2 className="mb-4 text-xl font-semibold text-white">Эх сурвалжууд</h2>
           <ul className="space-y-3 text-sm text-graphite-300">
             {post.source_urls.map((u, i) => (
               <li key={i}>
                 <a href={u} target="_blank" rel="noreferrer" className="transition hover:text-white">
                   {u}
                 </a>
               </li>
             ))}
           </ul>
         </section>
       </article>
     </main>
   );
 }
