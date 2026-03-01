import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: '',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'conversations/:id',
    renderMode: RenderMode.Client,
  },
  {
    path: 'admin/users',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'messages/:id',
    renderMode: RenderMode.Client,
  },
  {
    path: 'call-display',
    renderMode: RenderMode.Client,
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
