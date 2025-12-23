// vite.config.ts
import { defineConfig } from "file:///workspace/app-7wraacwkpcld/node_modules/.pnpm/vite@5.4.19_@types+node@24.2.1_lightningcss@1.30.1/node_modules/vite/dist/node/index.js";
import react from "file:///workspace/app-7wraacwkpcld/node_modules/.pnpm/@vitejs+plugin-react@4.7.0_vite@5.4.19_@types+node@24.2.1_lightningcss@1.30.1_/node_modules/@vitejs/plugin-react/dist/index.js";
import svgr from "file:///workspace/app-7wraacwkpcld/node_modules/.pnpm/vite-plugin-svgr@4.5.0_rollup@4.46.2_typescript@5.9.3_vite@5.4.19_@types+node@24.2.1_lightningcss@1.30.1_/node_modules/vite-plugin-svgr/dist/index.js";
import path from "path";
import { miaodaDevPlugin } from "file:///workspace/app-7wraacwkpcld/node_modules/.pnpm/miaoda-sc-plugin@1.0.38_vite@5.4.19_@types+node@24.2.1_lightningcss@1.30.1_/node_modules/miaoda-sc-plugin/dist/index.js";
var __vite_injected_original_dirname = "/workspace/app-7wraacwkpcld";
var vite_config_default = defineConfig({
  plugins: [react(), svgr({
    svgrOptions: {
      icon: true,
      exportType: "named",
      namedExport: "ReactComponent"
    }
  }), miaodaDevPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvd29ya3NwYWNlL2FwcC03d3JhYWN3a3BjbGRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi93b3Jrc3BhY2UvYXBwLTd3cmFhY3drcGNsZC92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vd29ya3NwYWNlL2FwcC03d3JhYWN3a3BjbGQvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgc3ZnciBmcm9tICd2aXRlLXBsdWdpbi1zdmdyJztcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuXG5pbXBvcnQgeyBtaWFvZGFEZXZQbHVnaW4gfSBmcm9tIFwibWlhb2RhLXNjLXBsdWdpblwiO1xuXG4vLyBodHRwczovL3ZpdGUuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtyZWFjdCgpLCBzdmdyKHtcbiAgICAgIHN2Z3JPcHRpb25zOiB7XG4gICAgICAgIGljb246IHRydWUsIGV4cG9ydFR5cGU6ICduYW1lZCcsIG5hbWVkRXhwb3J0OiAnUmVhY3RDb21wb25lbnQnLCB9LCB9KSwgbWlhb2RhRGV2UGx1Z2luKCldLFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHtcbiAgICAgICdAJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjJyksXG4gICAgfSxcbiAgfSxcbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFtUSxTQUFTLG9CQUFvQjtBQUNoUyxPQUFPLFdBQVc7QUFDbEIsT0FBTyxVQUFVO0FBQ2pCLE9BQU8sVUFBVTtBQUVqQixTQUFTLHVCQUF1QjtBQUxoQyxJQUFNLG1DQUFtQztBQVF6QyxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTLENBQUMsTUFBTSxHQUFHLEtBQUs7QUFBQSxJQUNwQixhQUFhO0FBQUEsTUFDWCxNQUFNO0FBQUEsTUFBTSxZQUFZO0FBQUEsTUFBUyxhQUFhO0FBQUEsSUFBa0I7QUFBQSxFQUFHLENBQUMsR0FBRyxnQkFBZ0IsQ0FBQztBQUFBLEVBQzlGLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLEtBQUssS0FBSyxRQUFRLGtDQUFXLE9BQU87QUFBQSxJQUN0QztBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
