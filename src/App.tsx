import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { KeyboardControls } from "@react-three/drei";
import { Scene } from "./components/Scene";

// Карта клавиш, совместимая со стандартными именами Drei KeyboardControls
const keyboardMap = [
  { name: "forward", keys: ["ArrowUp", "KeyW"] },
  { name: "back", keys: ["ArrowDown", "KeyS"] },
  { name: "left", keys: ["ArrowLeft", "KeyA"] },
  { name: "right", keys: ["ArrowRight", "KeyD"] },
  { name: "brake", keys: ["Space"] },
  { name: "reset", keys: ["KeyR"] },
];

function App() {
  return (
    <KeyboardControls map={keyboardMap}>
      <Canvas camera={{ position: [-6, 3.9, 6.21], fov: 40 }}>
        {/* 
          1. Оставили только 100% поддерживаемые типы из PhysicsProps
          2. maxCcdSubsteps={4} контролирует максимальное число подкадров 
             для расчета непрерывных столкновений (CCD) нашей машины.
        */}
        <Physics debug gravity={[0, -9.81, 0]} numSolverIterations={12} maxCcdSubsteps={4}>
          <Scene />
        </Physics>
      </Canvas>
    </KeyboardControls>
  );
}

export default App;
