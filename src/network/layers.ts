export const layerName = (id: number) => 'Layer ' + String(id).padStart(2, '0')
export const rankName = (rank: number) => ['一维向量', '二维矩阵', '三维张量'][rank - 1]
