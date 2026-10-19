import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { RigidBody, useRapier, CuboidCollider, RapierRigidBody } from "@react-three/rapier";
import { Group, Vector3, Quaternion, Object3D } from "three";
import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import { useControlStore } from "./useControls";

const CAR_CONFIG = {
  chassis: {
    width: 0.3,
    height: 0.12,
    length: 0.6,
    mass: 200,
  },
  wheels: {
    radius: 0.1,
    width: 0.04,
    // ИСПРАВЛЕНО: Индексы 0 и 1 теперь имеют z: -0.25 (Задняя ось масл-кара)
    // Индексы 2 и 3 теперь имеют z: 0.28 (Передняя поворотная ось масл-кара)
    positions: [
      { x: -0.14, y: -0.09, z: -0.25 }, // Колесо 0 (Заднее правое)
      { x: 0.14, y: -0.09, z: -0.25 }, // Колесо 1 (Заднее левое)
      { x: -0.14, y: -0.09, z: 0.28 }, // Колесо 2 (Переднее правое -> рулит и стоит спереди)
      { x: 0.14, y: -0.09, z: 0.28 }, // Колесо 3 (Переднее левое  -> рулит и стоит спереди)
    ],
  },
  engineForce: 1.5,
  brakeForce: 5,
  steeringAngle: 0.45,
  turnSpeed: 4,
};

const LOCAL_FORWARD = new Vector3(0, 0, 1);
const CURRENT_FORWARD = new Vector3();
const CHASSIS_POS = new Vector3();
const CHASSIS_ROT = new Quaternion();
const WHEEL_OFFSET = new Vector3();

export function Car() {
  // Загружаем масл-кар через кэшируемый useGLTF
  const { scene } = useGLTF("/models/car.glb");

  // ИМПОРТ МОДЕЛИ: Чистый clone() и getObjectByName БЕЗ traverse
  const { bodyMesh, wheelMeshes } = useMemo(() => {
    if (!scene) return { bodyMesh: null, wheelMeshes: [] };

    // Клонируем граф сцены
    const root = scene.clone();

    // Поштучно вытаскиваем узлы по точным именам из консоли
    const body = root.getObjectByName("Muscle_car_2Body");
    const orderedWheels = [
      root.getObjectByName("5WheelBkR"),
      root.getObjectByName("5WheelBkL"),
      root.getObjectByName("5WheelFtR"),
      root.getObjectByName("5WheelFtL"),
    ];

    // Масштабируем кузов под размеры коллайдера
    if (body) {
      const validBody = body as Object3D;
      validBody.scale.set(0.07, 0.07, 0.07);
      validBody.position.set(0, -0.35, 0);
    }

    // Масштабируем колеса
    orderedWheels.forEach((w) => {
      if (w) {
        const validWheel = w as Object3D;
        validWheel.scale.set(0.08, 0.08, 0.08);
        validWheel.position.set(0, 0, 0); // Обнуляем внутренний сдвиг пивота
      }
    });

    return { bodyMesh: body, wheelMeshes: orderedWheels };
  }, [scene]);

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
        0.25,
        CAR_CONFIG.wheels.radius,
      );
    });

    for (let i = 0; i < controller.numWheels(); i++) {
      controller.setWheelSuspensionStiffness(i, 25);
      controller.setWheelSuspensionCompression(i, 4.5);
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

    controller.setWheelEngineForce(0, currentEngineForce);
    controller.setWheelEngineForce(1, currentEngineForce);

    controller.setWheelSteering(2, currentSteering);
    controller.setWheelSteering(3, currentSteering);

    const brakeValue = brake ? CAR_CONFIG.brakeForce : 0;
    for (let i = 0; i < 4; i++) {
      controller.setWheelBrake(i, brakeValue);
    }

    controller.updateVehicle(world.timestep);

    // --- ВАША СТАБИЛЬНАЯ СИСТЕМА ДВИЖЕНИЯ И ПОВОРОТОВ ---
    const velocity = chassisRef.current.linvel();
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);

    const rapierPos = chassisRef.current.translation();
    const rapierRot = chassisRef.current.rotation();

    CHASSIS_POS.set(rapierPos.x, rapierPos.y, rapierPos.z);
    CHASSIS_ROT.set(rapierRot.x, rapierRot.y, rapierRot.z, rapierRot.w);

    if (speed > 0.2) {
      CURRENT_FORWARD.copy(LOCAL_FORWARD).applyQuaternion(CHASSIS_ROT);
      const dotProduct = velocity.x * CURRENT_FORWARD.x + velocity.z * CURRENT_FORWARD.z;
      const isMovingForward = dotProduct > 0;

      let turnDirection = 0;
      if (left) turnDirection = isMovingForward ? 1 : -1;
      if (right) turnDirection = isMovingForward ? -1 : 1;

      if (turnDirection !== 0) {
        chassisRef.current.setAngvel(
          { x: 0, y: turnDirection * CAR_CONFIG.turnSpeed * (speed / 5), z: 0 },
          true,
        );
      }
    }

    const directionSign = forward ? -1 : back ? 1 : 0;
    wheelRotationAngle.current += speed * world.timestep * directionSign * 3;

    // НАДЁЖНАЯ ВАША СИНХРОНИЗАЦИЯ КОЛЕС ПО ОСЯМ
    for (let i = 0; i < 4; i++) {
      const wheelVisual = wheelRefs.current[i];
      if (!wheelVisual) continue;

      const pos = CAR_CONFIG.wheels.positions[i];
      const suspensionLength = controller.wheelSuspensionLength(i) ?? 0;

      // Рассчитываем смещение
      WHEEL_OFFSET.set(pos.x, pos.y - suspensionLength, pos.z);
      WHEEL_OFFSET.applyQuaternion(CHASSIS_ROT);

      // Позиционируем контейнер колеса в мировых координатах
      wheelVisual.position.copy(CHASSIS_POS).add(WHEEL_OFFSET);
      wheelVisual.quaternion.copy(CHASSIS_ROT);

      // Руление передней оси
      if (i === 2 || i === 3) {
        wheelVisual.rotateY(currentSteering);
      }

      // Вращение протектора 3D-модели вокруг её внутренней оси
      if (wheelVisual.children[0]) {
        wheelVisual.children[0].rotation.x = wheelRotationAngle.current;
      }
    }
  });

  return (
    <>
      {/* ФИЗИЧЕСКОЕ ТЕЛО КУЗОВА */}
      <RigidBody
        ref={chassisRef}
        position={[-3, 0.8, 4.5]}
        rotation={[0, Math.PI, 0]}
        mass={CAR_CONFIG.chassis.mass}
        canSleep={false}
        ccd={true}
        linearDamping={4}
        angularDamping={18.0}>
        {bodyMesh && <primitive object={bodyMesh} />}

        <CuboidCollider
          args={[
            CAR_CONFIG.chassis.width / 2,
            CAR_CONFIG.chassis.height / 2,
            0.45 / 2, // ИСПРАВЛЕНО: Уменьшили длину физического куба с 0.6 до 0.45, чтобы освободить лучи задней подвески
          ]}
        />
      </RigidBody>

      {/* ГРАФИЧЕСКИЕ КОЛЕСА С ИЗОЛИРОВАННЫМИ ГРУППАМИ КОРРЕКЦИИ PIVOT */}
      {CAR_CONFIG.wheels.positions.map((_, index) => (
        <group
          key={index}
          ref={(el) => {
            wheelRefs.current[index] = el;
          }}>
          {wheelMeshes[index] && (
            <group position={[0, 0, 0]} rotation={[0, 0, 0]}>
              <primitive object={wheelMeshes[index] as Object3D} />
            </group>
          )}
        </group>
      ))}
    </>
  );
}

// Предзагрузка модели в кэш Drei для исключения микрофризов сцены
useGLTF.preload("/models/car.glb");
