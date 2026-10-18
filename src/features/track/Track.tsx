import { useLoader } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Mesh } from "three";

export function Track() {
  // Загружаем GLTF модель трассы
  const gltf = useLoader(GLTFLoader, "/models/track.glb");

  // Получаем текстуру.
  const colorMap = useTexture("/textures/track.png");

  // Безопасно достаем геометрию первого меша из сцены GLTF
  const meshNode = gltf.scene.children[0] as Mesh;
  const geometry = meshNode?.geometry;

  if (!geometry) return null;

  return (
    <mesh>
      {/* Прикрепляем геометрию */}
      <primitive object={geometry} attach="geometry" />

      {/* Настраиваем материал */}
      <meshBasicMaterial toneMapped={false}>
        {/* 
          Декларативно прокидываем текстуру в свойство "map" материала.
          Атрибут anisotropy={16} будет применен движком R3F автоматически.
        */}
        <primitive object={colorMap} attach="map" anisotropy={16} />
      </meshBasicMaterial>
    </mesh>
  );
}
