import {SERVICE} from './racebox.js';
export const DEVICE_INFO='0000180a-0000-1000-8000-00805f9b34fb';
export const MODEL='00002a24-0000-1000-8000-00805f9b34fb';
// Advertisements may omit the UART UUID. Authorize both services explicitly,
// then verify the real model over GATT before accepting any telemetry.
export function raceboxRequestOptions(all=false){return {...(all?{}:{namePrefix:'RaceBox Mini'}),optionalServices:[SERVICE,DEVICE_INFO]};}
export function raceboxModel(value){return new TextDecoder().decode(value).replace(/\0/g,'').trim();}
