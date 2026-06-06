import { NextResponse } from "next/server";

/**
 * GET /api/3d/heart-model
 * 返回 3D 心脏模型的标注数据（Mock）
 *
 * 响应结构包含四腔位置、关键解剖坐标、预设视图数据
 * 后续可替换为来自真实 3D 建模工具（如 3D Slicer / CT 重建）的坐标数据
 */

interface Annotation {
  id: string;
  name: string;
  nameCn: string;
  type: "chamber" | "vessel" | "annulus" | "bundle" | "line";
  color: string;
  vertices: [number, number, number][]; // 3D 坐标
}

interface ModelData {
  version: string;
  meshUrl: string;
  defaultView: { rotation: [number, number, number]; zoom: number };
  annotations: Annotation[];
}

const MOCK_MODEL: ModelData = {
  version: "1.0.0-mock",
  meshUrl: "/assets/heart-model.glb", // 后续替换为真实 3D 模型
  defaultView: { rotation: [-15, 15, 0], zoom: 1 },
  annotations: [
    {
      id: "ra", name: "Right Atrium", nameCn: "右心房",
      type: "chamber", color: "#64748b",
      vertices: [[-30, -20, 0], [30, -20, 0], [30, 40, 0], [-30, 40, 0]],
    },
    {
      id: "la", name: "Left Atrium", nameCn: "左心房",
      type: "chamber", color: "#94a3b8",
      vertices: [[-25, -15, 10], [25, -15, 10], [25, 35, 10], [-25, 35, 10]],
    },
    {
      id: "rv", name: "Right Ventricle", nameCn: "右心室",
      type: "chamber", color: "#475569",
      vertices: [[-25, -50, 0], [20, -50, 0], [20, -20, 0], [-25, -20, 0]],
    },
    {
      id: "lv", name: "Left Ventricle", nameCn: "左心室",
      type: "chamber", color: "#334155",
      vertices: [[-20, -45, 10], [20, -45, 10], [20, -20, 10], [-20, -20, 10]],
    },
    {
      id: "pv", name: "Pulmonary Veins", nameCn: "肺静脉",
      type: "vessel", color: "#f59e0b",
      vertices: [[-10, -55, 20], [10, -55, 20], [15, -60, 22], [-15, -60, 22]],
    },
    {
      id: "cs", name: "Coronary Sinus", nameCn: "冠状窦",
      type: "vessel", color: "#10b981",
      vertices: [[20, -10, 0], [25, -5, 0], [28, 0, 0]],
    },
    {
      id: "ta", name: "Tricuspid Annulus", nameCn: "三尖瓣环",
      type: "annulus", color: "#60a5fa",
      vertices: Array.from({ length: 16 }, (_, i) => {
        const angle = (i / 16) * Math.PI * 2;
        return [Math.cos(angle) * 18, -20 + Math.sin(angle) * 8, 0] as [number, number, number];
      }),
    },
    {
      id: "ma", name: "Mitral Annulus", nameCn: "二尖瓣环",
      type: "annulus", color: "#a78bfa",
      vertices: Array.from({ length: 16 }, (_, i) => {
        const angle = (i / 16) * Math.PI * 2;
        return [Math.cos(angle) * 16, -20 + Math.sin(angle) * 7, 10] as [number, number, number];
      }),
    },
    {
      id: "his", name: "Bundle of His", nameCn: "His 束",
      type: "bundle", color: "#f43f5e",
      vertices: [[0, 5, 0], [0, 10, 0], [0, 15, 0]],
    },
    {
      id: "cti_line", name: "CTI Ablation Line", nameCn: "CTI 消融线",
      type: "line", color: "#ef4444",
      vertices: [[20, -50, 0], [20, -30, 0], [18, -20, 0], [15, -10, 0]],
    },
  ],
};

export async function GET() {
  return NextResponse.json(MOCK_MODEL);
}
