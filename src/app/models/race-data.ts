export interface RaceData {
    id: string;
    Cars: Car[];
    DurationSecs: number;
    Events: Event[];
    Laps: Lap[];
    RaceLaps: number;
    Result: Result[];
    TrackConfig: string;
    TrackName: string;
    Type: string;
    sourceFile: string;
    uploadedAt: Date;
}

interface Car {
    CarId: number;
    BallastKG: number;
    Driver: Driver;
    Moel: string;
    Restrictor: number;
    Skin: string
}

interface Driver {
    Guid: string;
    Name: string;
}

interface Event {
    CarId: number;
    Driver: Driver;
    ImpactSpeed: number;
    OtherCarId: number;
    OtherDriver: Driver;
    RelPosition: Position;
    Type: EventType;
    WorldPosition: Position;
}

interface Position {
    X: number;
    Y: number;
    Z: number;
}

enum EventType {
    COLLISION_WITH_CAR = 0
}

interface Lap {
    BallastKG: number;
    CarId: number;
    CarModel: string;
    Cuts: 0;
    DriverGuid: string;
    DriverName: string;
    LapTime: number;
    Restrictor: number;
    Sectors: number[];
    Timestamp: number;
    Tyre: string;
}

export interface Result {
    BallastKG: number;
    BestLap: number;
    CarId: number;
    CarModel: string;
    DriverGuid: string;
    DriverName: string;
    Restrictor: number;
    TotalTime: number;
}
