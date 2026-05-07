export interface CarriagePrice {
    carriageType: string;
    carriageTypeLabel: string;
    minPrice: number;
    availableSeats: number;
    totalSeats: number;
}

export interface TripResult {
    id: number;
    trainId: number;
    trainCode: string;
    trainName: string;
    originName: string;
    destinationName: string;
    departureTime: string;
    arrivalTime: string;
    departureDate: string;
    duration: string;
    nextDay: boolean;
    status: string;
    boardStopOrder: number;
    alightStopOrder: number;
    boardDistanceKm: number;
    alightDistanceKm: number;
    carriagePrices: CarriagePrice[];
}
