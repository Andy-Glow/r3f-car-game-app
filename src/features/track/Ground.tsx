import { useTexture, MeshReflectorMaterial } from "@react-three/drei";
import { useLayoutEffect, useRef } from "react";
import { BufferAttribute, Mesh, RepeatWrapping } from "three";

export function Ground() {
  const meshRef = useRef<Mesh>(null);

  // Загружаем текстуры. Больше никаких изменений свойств в JS-коде!
  const [gridMap, aoMap] = useTexture([
    "/textures/grid.png",
    "/textures/ground-ao.png",
  ]);

  // В useLayoutEffect оставляем исключительно настройку локальной геометрии
  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || !mesh.geometry) return;

    const uvs = mesh.geometry.attributes.uv;
    if (uvs) {
      mesh.geometry.setAttribute("uv2", new BufferAttribute(uvs.array, 2));
    }
  }, []); // Срабатывает строго один раз при монтировании

  return (
    <mesh
      ref={meshRef}
      position={[-2.285, -0.015, -1.325]}
      rotation={[-Math.PI * 0.5, 0, -0.079]}
    >
      <circleGeometry args={[6.12, 50]} />

      <MeshReflectorMaterial
        aoMap={aoMap}
        transparent={false}
        color={[0.1, 0.1, 0.1]}
        envMapIntensity={0.2}
        metalness={0.1}
        roughness={0.5}
        dithering={true}
        blur={[0, 0]}
        mixBlur={0}
        mixStrength={2}
        mixContrast={1}
        resolution={512}
        mirror={0.7}
        depthScale={0.01}
        minDepthThreshold={0.9}
        maxDepthThreshold={1}
        depthToBlurRatioBias={0.25}
        reflectorOffset={0.02}
      >
        {/* 
          Декларативная настройка тайлинга сетки прямо в JSX.
          React Compiler полностью доволен, так как в JS коде нет мутаций.
        */}
        <primitive
          object={gridMap}
          attach="map"
          anisotropy={16}
          wrapS={RepeatWrapping}
          wrapT={RepeatWrapping}
          repeat={[30, 30]} // Возвращаем аккуратную мелкую сетку
        />
      </MeshReflectorMaterial>
    </mesh>
  );
}
