export type Shape = [number] | [number, number] | [number, number, number]
export type Position = [number, number, number]
export interface Layer {
  id: number
  shape: Shape
  count: number
}
export interface NodeRef {
  layer: number
  index: number
}
export type Direction = 'self' | 'upstream' | 'downstream'
export type Pair = [number, number]
export type Conv2DOptions = {
  in_channels?: number
  out_channels: number
  kernel_size: number | Pair
  stride?: number | Pair
  padding?: number | Pair
  dilation?: number | Pair
  groups?: number
}
export type Conv2DParameters = {
  in_channels: number
  out_channels: number
  kernel_size: Pair
  stride: Pair
  padding: Pair
  dilation: Pair
  groups: number
}

export interface Operation {
  type: 'Conv2D'
  input: Layer
  output: Layer
  parameters: Conv2DParameters
  getUpstreamNeurons: (outputNeuronIndex: number) => number[]
  getDownstreamNeurons: (inputNeuronIndex: number) => number[]
}

export interface Graph {
  layers: Layer[]
  operations: Operation[]
}
