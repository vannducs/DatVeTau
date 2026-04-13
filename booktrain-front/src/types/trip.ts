export interface CarriagePrice {
    carriageType: string;
    carriageTypeLabel: string;
    minPrice: number;
    availableSeats: number;
}

export interface TripResult {
    id: number;
    trainCode: string;
    trainName: string;
    trainType: string;
    originName: string;
    destinationName: string;
    departureTime: string;
    arrivalTime: string;
    duration: string;
    nextDay: boolean;
    status: string;
    carriagePrices: CarriagePrice[];
}