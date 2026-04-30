import { apiGet, apiPost, apiPut, apiDelete } from "@/api/api";

export const base44 = {
  // =========================
  // AUTH
  // =========================
  auth: {
    async me() {
      try {
        return await apiGet("/auth/me");
      } catch {
        return null;
      }
    },
    redirectToLogin() {
      window.location.href = "/login";
    },
    logout() {
      return apiPost("/auth/logout");
    }
  },

  // =========================
  // ENTITIES
  // =========================
  entities: {
    Playlist: {
      list: () => apiGet("/playlists"),
      get: (id) => apiGet(`/playlists/${id}`),
      create: (data) => apiPost("/playlists", data),
      update: (id, data) => apiPut(`/playlists/${id}`, data),
      delete: (id) => apiDelete(`/playlists/${id}`)
    },

    Media: {
      list: () => apiGet("/media"),
      get: (id) => apiGet(`/media/${id}`),
      create: (data) => apiPost("/media", data),
      update: (id, data) => apiPut(`/media/${id}`, data),
      delete: (id) => apiDelete(`/media/${id}`)
    },

    Screen: {
      list: () => apiGet("/screens"),
      get: (id) => apiGet(`/screens/${id}`),
      create: (data) => apiPost("/screens", data),
      update: (id, data) => apiPut(`/screens/${id}`, data),
      delete: (id) => apiDelete(`/screens/${id}`)
    },

    LayoutZone: {
      list: () => apiGet("/layout-zones"),
      get: (id) => apiGet(`/layout-zones/${id}`),
      create: (data) => apiPost("/layout-zones", data),
      update: (id, data) => apiPut(`/layout-zones/${id}`, data),
      delete: (id) => apiDelete(`/layout-zones/${id}`)
    },

    Advertiser: {
      list: () => apiGet("/advertisers"),
      filter: () => apiGet("/advertisers")
    }
  },

  // =========================
  // INTEGRATIONS (stubbed)
  // =========================
  integrations: {
    Core: {
      call: async () => {
        console.warn("Integration stub called");
        return [];
      }
    }
  }
};