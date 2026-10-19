import { MeshReflectorMaterial } from "@react-three/drei";
import { useLoader } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { BufferAttribute, Mesh, RepeatWrapping, Texture, TextureLoader } from "three";
// Импортируем физические компоненты Rapier
import { CuboidCollider, RigidBody } from "@react-three/rapier";

export function Ground() {
  const gridMap = useLoader(TextureLoader, "/textures/grid.png", (texture) => {
    if (texture instanceof Texture) {
      texture.wrapS = RepeatWrapping;
      texture.wrapT = RepeatWrapping;
      texture.repeat.set(30, 30);
      texture.anisotropy = 16;
    }
  }) as Texture;

  const aoMap = useLoader(TextureLoader, "/textures/ground-ao.png") as Texture;

  const alphaMap = useLoader(TextureLoader, "/textures/alpha-map.png", (texture) => {
    if (texture instanceof Texture) {
      texture.wrapS = RepeatWrapping;
      texture.wrapT = RepeatWrapping;
      texture.repeat.set(30, 30);
    }
  }) as Texture;

  const meshRef = useRef<Mesh>(null);
  const meshRef2 = useRef<Mesh>(null);

  useEffect(() => {
    const mesh = meshRef.current;
    const mesh2 = meshRef2.current;
    if (!mesh || !mesh2 || !mesh.geometry || !mesh2.geometry) return;

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

      {/* 
        ТВЕРДАЯ ПЛИТА ПОД ЗЕРКАЛОМ:
        position совпадает с центром вашего зеркального круга.
        Размеры CuboidCollider задаются как полу-размеры (half-extents):
        args={[ширина/2, толщина/2, длина/2]}. 
        args={[10, 0.1, 10]} создает огромную твердую площадку 20x20 метров толщиной 20см.
      */}
      <RigidBody type='fixed'>
        <CuboidCollider args={[10, 0.1, 10]} position={[-2.285, -0.11, -1.325]} />
      </RigidBody>
    </>
  );
}
