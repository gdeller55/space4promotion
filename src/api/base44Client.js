import { apiGet, apiPost, apiDelete } from "@/api/api";

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
    Screen: {
      list: () => apiGet("/api/screens"),

      get: (id) => apiGet(`/screens/${id}`),

      create: (data) => apiPost("/screens", data),

      delete: (id) => apiDelete(`/screens/${id}`)
    },

    Playlist: {
      list: () => apiGet("/playlists")
    },

    Media: {
      list: () => apiGet("/media")
    },

    LayoutZone: {
      list: () => apiGet("/layout-zones")
    },

    Advertiser: {
      filter: () => apiGet("/advertisers")
    }
  },

  // =========================
  // INTEGRATIONS
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