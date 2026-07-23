import React from 'react';
import { Link } from 'react-router-dom';
 
 export default function BlogCard({ post }) {
   return (
     <Link
       to={`/blog/${post.slug}`}
       className="group block overflow-hidden rounded-[28px] border border-graphite-800 bg-graphite-950/90 shadow-[0_24px_80px_rgba(0,0,0,0.15)] transition duration-300 hover:-translate-y-1 hover:border-graphite-600"
     >
       <div className="relative h-56 overflow-hidden bg-graphite-900">
         <img src={post.featured_image} alt={post.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
         <div className="absolute inset-0 bg-gradient-to-t from-graphite-950/90 via-graphite-950/40 to-transparent" />
       </div>
       <div className="space-y-3 p-6">
         <p className="text-xs uppercase tracking-[0.32em] text-graphite-400">Блог</p>
         <h3 className="text-xl font-semibold leading-tight text-graphite-50">{post.title}</h3>
         <p className="text-sm leading-6 text-graphite-400">{post.excerpt}</p>
         <div className="flex items-center justify-between pt-4 text-sm text-graphite-500">
           <span>{post.author}</span>
           <time dateTime={post.created_at}>{post.created_at}</time>
         </div>
       </div>
     </Link>
   );
}
