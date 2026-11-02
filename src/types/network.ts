export type Shape = [number] | [number, number] | [number, number, number]
export type Position = [number, number, number]
export interface Layer { id: number; shape: Shape; count: number }
export interface NodeRef { layer: number; index: number }
export type Direction = 'self' | 'upstream' | 'downstream'
export interface Connection {
  source_layer: number
  source_neuron_index: number
  target_layer: number
  target_neuron_index: number
}
