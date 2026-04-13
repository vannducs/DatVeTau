export interface SeatDTO {
    id: number;
    seatNumber: string;
    berthPosition: string; // "upper" | "lower" | "middle" | "seat"
    ticketPrice: number;
    status: string;        // "available" | "booked" | "unavailable"
    carriageId: number;
    carriageNumber: number;
    carriageType: string;
}

export interface CarriageSeats {
    carriageNumber: number;
    carriageType: string;
    seats: SeatDTO[];
}