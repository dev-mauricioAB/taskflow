export * from "./task";
export * from "./user";
export * from "./projects";
export * from "./activity";

export type AppEvents =
  | import("./task").TaskEvents
  | import("./user").UserEvents
  | import("./projects").ProjectEvents
  | import("./activity").ActivityEvents;
