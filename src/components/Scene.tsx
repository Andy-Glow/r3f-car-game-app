import {
  Environment,
  OrbitControls,
  PerspectiveCamera,
} from "@react-three/drei";
import { Suspense } from "react";
import { Track } from "../features/track/Track";
import { Ground } from "../features/track/Ground";

// Явно экспортируем именованную функцию (лучше для React Compiler)
export function Scene() {
  return (
    <Suspense fallback={null}>
      <Environment files="/textures/envmap.hdr" background />

      <PerspectiveCamera makeDefault position={[-6, 3.9, 6.21]} fov={40} />

      {/* Наш проект требует высокой производительности на мобильных, */}
      {/* поэтому отключаем панорамирование (enablePan={false}), как в конфиге */}
      <OrbitControls target={[-2.64, -0.71, 0.03]} enablePan={false} />

      <Track />
      <Ground />
    </Suspense>
  );
}
