use tauri::{Manager,menu::{Menu,MenuItem},tray::TrayIconBuilder};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run(){
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_notification::init())
    .plugin(tauri_plugin_process::init())
    .plugin(tauri_plugin_http::init())
    .plugin(tauri_plugin_store::Builder::new().build())
    .plugin(tauri_plugin_updater::Builder::new().build())
    .setup(|app|{
      let show=MenuItem::with_id(app,"show","Gennetex нээх",true,None::<&str>)?;
      let quit=MenuItem::with_id(app,"quit","Гарах",true,None::<&str>)?;
      let menu=Menu::with_items(app,&[&show,&quit])?;
      let _tray=TrayIconBuilder::new().menu(&menu).tooltip("Gennetex ERP").on_menu_event(|app,event|match event.id.as_ref(){"show"=>{if let Some(window)=app.get_webview_window("main"){let _=window.show();let _=window.set_focus();}},"quit"=>app.exit(0),_=>{}}).build(app)?;
      Ok(())
    })
    .on_window_event(|window,event|if let tauri::WindowEvent::CloseRequested{api,..}=event{api.prevent_close();let _=window.hide();})
    .run(tauri::generate_context!()).expect("Gennetex desktop runtime failed");
}
