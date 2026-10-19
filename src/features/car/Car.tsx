import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { RigidBody, useRapier, CuboidCollider, RapierRigidBody } from "@react-three/rapier";
import { Group, Mesh } from "three";
import { useControlStore } from "./useControls";

const CAR_CONFIG = {
  chassis: {
    width: 0.3,
    height: 0.15,
    length: 0.6,
    mass: 200,
  },
  wheels: {
    radius: 0.08,
    width: 0.04,
    positions: [
      { x: -0.2, y: -0.05, z: -0.22 },
      { x: 0.2, y: -0.05, z: -0.22 },
      { x: -0.2, y: -0.05, z: 0.22 },
      { x: 0.2, y: -0.05, z: 0.22 },
    ],
  },
  engineForce: 15, // Уменьшили с 80 до 15, чтобы избежать безумного букса
  brakeForce: 20,
  steeringAngle: 0.45,
};

export function Car() {
  const chassisRef = useRef<RapierRigidBody>(null);
  const wheelRefs = useRef<(Group | null)[]>([]);

  const { world } = useRapier();
  // Автоматический вывод типа контроллера исключает любые конфликты версий
  const vehicleController = useRef<ReturnType<typeof world.createVehicleController> | null>(null);

  useEffect(() => {
    if (!chassisRef.current || !world) return;

    const chassisBody = chassisRef.current;
    const controller = world.createVehicleController(chassisBody);

    CAR_CONFIG.wheels.positions.forEach((pos) => {
      controller.addWheel(
        { x: pos.x, y: pos.y, z: pos.z },
        { x: 0, y: -1, z: 0 },
        { x: 1, y: 0, z: 0 }, // Исправлено: сменили -1 на 1, чтобы инвертировать ход вперед/назад
        0.12,
        CAR_CONFIG.wheels.radius,
      );
    });

    for (let i = 0; i < controller.numWheels(); i++) {
      controller.setWheelSuspensionStiffness(i, 7.0);
      controller.setWheelSuspensionCompression(i, 2.5);
      controller.setWheelSuspensionRelaxation(i, 3.5);
      controller.setWheelFrictionSlip(i, 5.0);
    }

    vehicleController.current = controller;

    return () => {
      if (vehicleController.current && world) {
        world.removeVehicleController(vehicleController.current);
        vehicleController.current = null;
      }
    };
  }, [world]);

  useFrame(() => {
    if (!vehicleController.current || !chassisRef.current || !world) return;

    const controller = vehicleController.current;
    const { forward, back, left, right, brake, reset } = useControlStore.getState();

    if (reset) {
      chassisRef.current.setTranslation({ x: -1.5, y: 1.0, z: 3 }, true);
      chassisRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      chassisRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
      return;
    }

    let currentEngineForce = 0;
    let currentSteering = 0;

    if (forward) currentEngineForce = CAR_CONFIG.engineForce;
    if (back) currentEngineForce = -CAR_CONFIG.engineForce;

    if (left) currentSteering = CAR_CONFIG.steeringAngle;
    if (right) currentSteering = -CAR_CONFIG.steeringAngle;

    controller.setWheelEngineForce(0, currentEngineForce);
    controller.setWheelEngineForce(1, currentEngineForce);

    controller.setWheelSteering(2, currentSteering);
    controller.setWheelSteering(3, currentSteering);

    const brakeValue = brake ? CAR_CONFIG.brakeForce : 0;
    for (let i = 0; i < 4; i++) {
      controller.setWheelBrake(i, brakeValue);
    }

    // Исправлено: передаем только dt, остальные системные аргументы Rapier подтянет сам
    controller.updateVehicle(world.timestep);

    // Синхронизация подвески визуальных колес
    for (let i = 0; i < 4; i++) {
      const wheelVisual = wheelRefs.current[i];
      if (!wheelVisual) continue;

      // Исправлено: используем wheelChassisConnectionPointCs в соответствии с вашей декларацией
      const connection = controller.wheelChassisConnectionPointCs(i);

      // Добавлена проверка на null/undefined для длины подвески
      const suspensionLength = controller.wheelSuspensionLength(i) ?? 0;

      if (connection) {
        wheelVisual.position.y = connection.y - suspensionLength;
      }

      // Исправлено: безопасно крутим первый дочерний элемент (Mesh) внутри группы колеса
      const wheelMesh = wheelVisual.children[0] as Mesh;
      if (wheelMesh && (forward || back)) {
        wheelMesh.rotation.x += forward ? 0.2 : -0.2;
      }
    }
  });

  return (
    <RigidBody
      ref={chassisRef}
      position={[-1.5, 0.2, 3]} // Снизили высоту спавна, чтобы не было сильного удара
      mass={CAR_CONFIG.chassis.mass}
      canSleep={false}
      ccd={true} // ВКЛЮЧАЕМ НЕПРЕРЫВНОЕ ОТСЛЕЖИВАНИЕ СТОЛКНОВЕНИЙ
    >
      {/* ... весь остальной визуальный код кузова и колес из предыдущего шага */}
      <mesh castShadow>
        <boxGeometry
          args={[CAR_CONFIG.chassis.width, CAR_CONFIG.chassis.height, CAR_CONFIG.chassis.length]}
        />
        <meshBasicMaterial transparent opacity={0.4} color='orange' />
      </mesh>

      <CuboidCollider
        args={[
          CAR_CONFIG.chassis.width / 2,
          CAR_CONFIG.chassis.height / 2,
          CAR_CONFIG.chassis.length / 2,
        ]}
      />

      {CAR_CONFIG.wheels.positions.map((pos, index) => (
        <group
          key={index}
          position={[pos.x, pos.y, pos.z]}
          ref={(el) => {
            wheelRefs.current[index] = el;
          }}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry
              args={[
                CAR_CONFIG.wheels.radius,
                CAR_CONFIG.wheels.radius,
                CAR_CONFIG.wheels.width,
                16,
              ]}
            />
            <meshNormalMaterial transparent opacity={0.6} />
          </mesh>
        </group>
      ))}
    </RigidBody>
  );
}
