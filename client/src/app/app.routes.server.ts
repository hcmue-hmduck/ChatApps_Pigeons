import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: '',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'conversations/:id',
    renderMode: RenderMode.Server,
  },
  {
    path: 'admin/users',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'messages/:id',
    renderMode: RenderMode.Server,
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
