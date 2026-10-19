import { MeshReflectorMaterial } from "@react-three/drei";
import { useLoader } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { BufferAttribute, Mesh, RepeatWrapping, Texture, TextureLoader } from "three";

export function Ground() {
  // Загрузка текстуры сетки с ленивой настройкой тайлинга и анизотропии для GPU
  const gridMap = useLoader(TextureLoader, "/textures/grid.png", (texture) => {
    if (texture instanceof Texture) {
      texture.wrapS = RepeatWrapping;
      texture.wrapT = RepeatWrapping;
      texture.repeat.set(30, 30);
      texture.anisotropy = 16;
    }
  }) as Texture;

  // Загрузка карты запеченных теней (Ambient Occlusion)
  const aoMap = useLoader(TextureLoader, "/textures/ground-ao.png") as Texture;

  // Загрузка альфа-маски с повторением шага сетки
  const alphaMap = useLoader(TextureLoader, "/textures/alpha-map.png", (texture) => {
    if (texture instanceof Texture) {
      texture.wrapS = RepeatWrapping;
      texture.wrapT = RepeatWrapping;
      texture.repeat.set(30, 30);
    }
  }) as Texture;

  // Ссылки на 3D-объекты для низкоуровневой работы с буферами геометрии
  const meshRef = useRef<Mesh>(null);
  const meshRef2 = useRef<Mesh>(null);

  // Синхронная генерация uv2-координат сразу после монтирования сцены
  useEffect(() => {
    const mesh = meshRef.current;
    const mesh2 = meshRef2.current;
    if (!mesh || !mesh2 || !mesh.geometry || !mesh2.geometry) return;

    // Извлечение базовой UV-развертки и создание второго канала uv2 для шейдеров тени и маски
    const uvs = mesh.geometry.attributes.uv?.array as Float32Array;
    if (uvs) {
      mesh.geometry.setAttribute("uv2", new BufferAttribute(uvs, 2));
    }

    const uvs2 = mesh2.geometry.attributes.uv?.array as Float32Array;
    if (uvs2) {
      mesh2.geometry.setAttribute("uv2", new BufferAttribute(uvs2, 2));
    }
  }, []);

  return (
    <>
      <mesh ref={meshRef2} position={[-2.285, -0.01, -1.325]} rotation-x={-Math.PI * 0.5}>
        <planeGeometry args={[12, 12]} />
        <meshBasicMaterial opacity={0.325} alphaMap={gridMap} transparent={true} color={"white"} />
      </mesh>
      <mesh
        ref={meshRef}
        position={[-2.285, -0.015, -1.325]}
        rotation-x={-Math.PI * 0.5}
        rotation-z={-0.079}>
        <circleGeometry args={[6.12, 50]} />
        <MeshReflectorMaterial
          aoMap={aoMap}
          alphaMap={alphaMap}
          transparent={true}
          color={[0.5, 0.5, 0.5]}
          envMapIntensity={0.35}
          metalness={0.05}
          roughness={0.2}
          dithering={true}
          blur={[500, 500]}
          mixBlur={4}
          mixStrength={15}
          mixContrast={1}
          resolution={1024}
          mirror={0.3}
          depthScale={0}
          minDepthThreshold={0.9}
          maxDepthThreshold={1}
          depthToBlurRatioBias={0.25}
          reflectorOffset={0.02}
        />
      </mesh>
    </>
  );
}
