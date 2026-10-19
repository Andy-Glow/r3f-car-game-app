import { useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Group, Mesh } from "three";

export function Car() {
  // Загружаем GLTF-модель автомобиля.
  const gltf = useLoader(GLTFLoader, "/models/car.glb");

  // Извлекаем корневую сцену модели и типизируем её как Group Three.js
  const carScene = gltf.scene as Group;

  // Безопасно настраиваем позицию дочернего меша автомобиля
  // Делаем это один раз при чтении графа, чтобы не вызывать побочных эффектов
  const firstChild = carScene.children[0] as Mesh;
  if (firstChild) {
    firstChild.position.set(-2000, -1, -2000);
  }

  return (
    // Декларативно рендерим модель на сцене.
    // Все настройки масштаба и вращения прокидываем через пропсы R3F.
    <primitive object={carScene} scale={[0.0012, 0.0012, 0.0012]} rotation-y={Math.PI / 2} />
  );
}
