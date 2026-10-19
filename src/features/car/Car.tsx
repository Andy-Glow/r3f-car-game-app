import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { RigidBody, useRapier, CuboidCollider, RapierRigidBody } from "@react-three/rapier";
import { Group, Vector3 } from "three";
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
      { x: -0.22, y: -0.05, z: -0.2 }, // Колесо 0 (Заднее левое)
      { x: 0.22, y: -0.05, z: -0.2 }, // Колесо 1 (Заднее правое)
      { x: -0.22, y: -0.05, z: 0.2 }, // Колесо 2 (Переднее левое)
      { x: 0.22, y: -0.05, z: 0.2 }, // Колесо 3 (Переднее правое)
    ],
  },
  engineForce: 5, // Сохранили вашу настройку силы
  brakeForce: 50,
  steeringAngle: 0.35,
  turnSpeed: 4, // Сохранили вашу силу углового вращения
};

// Создаем статический вектор для оптимизации памяти и Garbage Collector
const LOCAL_FORWARD = new Vector3(0, 0, 1);
const CURRENT_FORWARD = new Vector3();

export function Car() {
  const chassisRef = useRef<RapierRigidBody>(null);
  const wheelRefs = useRef<(Group | null)[]>([]);
  const wheelRotationAngle = useRef(0);

  const { world } = useRapier();
  const vehicleController = useRef<ReturnType<typeof world.createVehicleController> | null>(null);

  useEffect(() => {
    if (!chassisRef.current || !world) return;

    const chassisBody = chassisRef.current;
    const controller = world.createVehicleController(chassisBody);

    CAR_CONFIG.wheels.positions.forEach((pos) => {
      controller.addWheel(
        { x: pos.x, y: pos.y, z: pos.z },
        { x: 0, y: -1, z: 0 },
        { x: -1, y: 0, z: 0 },
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
      chassisRef.current.setTranslation({ x: -1.5, y: 0.8, z: 3 }, true);
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

    // Газ на заднюю ось
    controller.setWheelEngineForce(0, currentEngineForce);
    controller.setWheelEngineForce(1, currentEngineForce);

    // Руление на переднюю ось
    controller.setWheelSteering(2, currentSteering);
    controller.setWheelSteering(3, currentSteering);

    const brakeValue = brake ? CAR_CONFIG.brakeForce : 0;
    for (let i = 0; i < 4; i++) {
      controller.setWheelBrake(i, brakeValue);
    }

    controller.updateVehicle(world.timestep);

    // --- ФИЗИЧЕСКИЙ КОРРЕКТОР ПОВОРОТА (НА ОСНОВЕ ЛОКАЛЬНЫХ ВЕКТОРОВ КУЗОВА) ---
    const velocity = chassisRef.current.linvel();
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);

    if (speed > 0.2) {
      // 1. Получаем текущий кватернион (поворот) кузова из Rapier
      const rotation = chassisRef.current.rotation();

      // 2. Рассчитываем, куда сейчас смотрит капот машины (локальный вектор вперед)
      CURRENT_FORWARD.copy(LOCAL_FORWARD).applyQuaternion(rotation);

      // 3. Скалярное произведение вектора скорости и капота.
      // Если результат > 0, машина физически едет передом, если < 0 — пятится задом.
      const dotProduct = velocity.x * CURRENT_FORWARD.x + velocity.z * CURRENT_FORWARD.z;
      const isMovingForward = dotProduct > 0;

      let turnDirection = 0;

      // Направление поворота инвертируется только тогда, когда мы катимся назад
      if (left) turnDirection = isMovingForward ? 1 : -1;
      if (right) turnDirection = isMovingForward ? -1 : 1;

      if (turnDirection !== 0) {
        chassisRef.current.setAngvel(
          { x: 0, y: turnDirection * CAR_CONFIG.turnSpeed * (speed / 5), z: 0 },
          true,
        );
      }
    }

    // Расчет угла визуального кручения
    const directionSign = forward ? -1 : back ? 1 : 0;
    wheelRotationAngle.current += speed * world.timestep * directionSign * 3;

    // СИНХРОНИЗАЦИЯ СЦЕНЫ И КОЛЕС
    for (let i = 0; i < 4; i++) {
      const wheelVisual = wheelRefs.current[i];
      if (!wheelVisual) continue;

      const pos = CAR_CONFIG.wheels.positions[i];
      const suspensionLength = controller.wheelSuspensionLength(i) ?? 0;

      // Смещение подвески
      wheelVisual.position.set(pos.x, pos.y - suspensionLength, pos.z);
      wheelVisual.rotation.set(0, 0, 0);

      // Рулевой поворот передних визуальных колес (2 и 3)
      if (i === 2 || i === 3) {
        wheelVisual.rotation.y = currentSteering;
      }

      // Вращение протектора
      const cylinderMesh = wheelVisual.children[0];
      if (cylinderMesh) {
        cylinderMesh.rotation.x = wheelRotationAngle.current;
      }
    }
  });

  return (
    <RigidBody
      ref={chassisRef}
      position={[-1.5, 0.8, 3]}
      mass={CAR_CONFIG.chassis.mass}
      canSleep={false}
      ccd={true}
      linearDamping={0.5}
      angularDamping={18.0} // Сохранили вашу настройку затухания
    >
      {/* Кузов */}
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

      {/* Колёса */}
      {CAR_CONFIG.wheels.positions.map((pos, index) => (
        <group
          key={index}
          position={[pos.x, pos.y, pos.z]}
          ref={(el) => {
            wheelRefs.current[index] = el;
          }}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
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
