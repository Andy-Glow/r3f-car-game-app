import { useLoader } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Mesh } from "three";
import { RigidBody, MeshCollider } from "@react-three/rapier";
import { useMemo } from "react";

export function Track() {
  const gltf = useLoader(GLTFLoader, "/models/track.glb");
  const colorMap = useTexture("/textures/track.png");

  // СТАНДАРТ ИНДУСТРИИ: Мемоизируем сборку 3D-графа через безопасное клонирование ассетов
  const MemoizedTrack = useMemo(() => {
    if (!gltf || !colorMap) return null;

    // ИСПРАВЛЕНО: Клонируем текстуру, чтобы уйти от ошибки "This value cannot be modified"
    const clonedTexture = colorMap.clone();
    clonedTexture.anisotropy = 16;

    // Клонируем сцену, чтобы не портить исходный кэш загрузчика
    const clonedScene = gltf.scene.clone();

    clonedScene.traverse((child) => {
      if (child instanceof Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        if (child.material) {
          const material = child.material.clone();
          material.map = clonedTexture; // Прокидываем клонированную текстуру с анизотропией
          material.toneMapped = false;
          child.material = material;
        }
      }
    });

    return clonedScene;
  }, [gltf, colorMap]);

  if (!MemoizedTrack) return null;

  return (
    // Физическое статичное тело, увеличенное в 3 раза
    <RigidBody type='fixed' scale={[3, 3, 3]}>
      {/* MeshCollider запекает trimesh ровно по контурам увеличенной мемоизированной модели */}
      <MeshCollider type='trimesh'>
        <primitive object={MemoizedTrack} />
      </MeshCollider>
    </RigidBody>
  );
}
