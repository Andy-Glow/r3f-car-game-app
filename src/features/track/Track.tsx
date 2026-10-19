import { useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
// Импортируем компонент твёрдого тела
import { RigidBody } from "@react-three/rapier";

export function Track() {
  const gltf = useLoader(GLTFLoader, "/models/track.glb");

  return (
    // type="fixed" делает объект неподвижным (статичным)
    // colliders="trimesh" создаёт точнейший физический каркас прямо по полигонам 3D-модели асфальта
    <RigidBody type='fixed' colliders='trimesh'>
      <primitive object={gltf.scene} />
    </RigidBody>
  );
}
