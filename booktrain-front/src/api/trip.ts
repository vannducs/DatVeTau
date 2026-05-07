import api from "./auth";

export const tripApi = {
    search: (originId: number, destinationId: number, date: string) =>
        api.get("/trips/search", {
            params: { originId, destinationId, date }
        }),

    getSeats: (tripId: number, originId: number, destinationId: number) =>
        api.get(`/trips/${tripId}/seats`, {
            params: { originId, destinationId }
        }),

    getById: (tripId: number, originId?: number, destinationId?: number) =>
        api.get(`/trips/${tripId}`, {
            params: { originId, destinationId }
        }),
};
