import axios from "axios";

const BASE = "http://localhost:8080/api/admin";

function authHeader() {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
}

const api = axios.create({ baseURL: BASE });
api.interceptors.request.use(cfg => {
    cfg.headers = { ...cfg.headers, ...authHeader() };
    return cfg;
});

// ─── Dashboard ───────────────────────────────────────────────────────────────
export const dashboardApi = {
    summary:      () => api.get("/dashboard/summary"),
    revenue:      (params: object) => api.get("/dashboard/revenue", { params }),
    topCustomers: (limit = 10) => api.get("/dashboard/top-customers", { params: { limit } }),
    popularRoutes:(limit = 10) => api.get("/dashboard/popular-routes", { params: { limit } }),
    recentOrders: (limit = 20) => api.get("/dashboard/orders/recent", { params: { limit } }),
    orderHistory: (params: object) => api.get("/dashboard/orders/history", { params }),
    trainOccupancy: () => api.get("/dashboard/train-occupancy"),
};

// ─── Trips ───────────────────────────────────────────────────────────────────
export const tripAdminApi = {
    list:   (params: object) => api.get("/trips", { params }),
    detail: (id: number)    => api.get(`/trips/${id}`),
    create: (body: object)  => api.post("/trips", body),
    update: (id: number, body: object) => api.put(`/trips/${id}`, body),
    delete: (id: number)    => api.delete(`/trips/${id}`),
};

// ─── Locations ───────────────────────────────────────────────────────────────
export const locationAdminApi = {
    list:      (search = "") => api.get("/locations", { params: { search } }),
    provinces: ()            => api.get("/locations/provinces"),
    create:    (body: object) => api.post("/locations", body),
    update:    (id: number, body: object) => api.put(`/locations/${id}`, body),
    delete:    (id: number)  => api.delete(`/locations/${id}`),
};

// ─── Users ───────────────────────────────────────────────────────────────────
export const userAdminApi = {
    list:         (params: object) => api.get("/users", { params }),
    detail:       (id: number)     => api.get(`/users/${id}`),
    updateStatus: (id: number, status: string) => api.put(`/users/${id}/status`, { status }),
    delete:       (id: number)     => api.delete(`/users/${id}`),
};

// ─── Seats ───────────────────────────────────────────────────────────────────
export const seatAdminApi = {
    stats:         ()             => api.get("/seats/stats"),
    byTrip:        (tripId: number) => api.get(`/seats/trips/${tripId}`),
    updateStatus:  (seatId: number, status: string) => api.put(`/seats/${seatId}/status`, { status }),
};

// ─── Payments ────────────────────────────────────────────────────────────────
export const paymentAdminApi = {
    list:   (params: object) => api.get("/payments", { params }),
    detail: (id: number)     => api.get(`/payments/${id}`),
    refund: (id: number)     => api.put(`/payments/${id}/refund`),
};
