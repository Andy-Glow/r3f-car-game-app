import {
  Environment,
  OrbitControls,
  PerspectiveCamera,
  useKeyboardControls,
} from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Track } from "../features/track/Track";
import { Ground } from "../features/track/Ground";
import { Car } from "../features/car/Car";
import { useControlStore } from "../features/car/useControls";

function KeyBridge() {
  // Забираем функцию getKeys (это второй элемент кортежа)
  const [, getKeys] = useKeyboardControls();

  useFrame(() => {
    const keys = getKeys();

    // Мгновенно обновляем стор БЕЗ ререндеров React-компонентов
    useControlStore.setState({
      forward: !!keys.forward,
      back: !!keys.back,
      left: !!keys.left,
      right: !!keys.right,
      brake: !!keys.brake,
      reset: !!keys.reset,
    });
  });

  return null;
}

export function Scene() {
  return (
    <>
      <KeyBridge />
      <Environment files='/textures/envmap.hdr' background />
      <PerspectiveCamera makeDefault position={[-6, 3.9, 6.21]} fov={40} />
      <OrbitControls target={[-2.64, -0.71, 0.03]} enablePan={false} />

      <Track />
      <Ground />
      <Car />
    </>
  );
}
