import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { Color3, Vector2, Vector3 } from "@babylonjs/core/Maths/math";
import { PointerEventTypes, PointerInfo } from "@babylonjs/core/Events/pointerEvents";
import { WebXRControllerComponent, WebXRDefaultExperience, WebXRManagedOutputCanvasOptions } from "@babylonjs/core/XR";
import { WebXRInputSource } from "@babylonjs/core/XR/webXRInputSource";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { AssetsManager } from "@babylonjs/core/Misc/assetsManager";
import { HighlightLayer} from "@babylonjs/core/Layers/highlightLayer";
import { PhysicsImpostor } from "@babylonjs/core/Physics/physicsImpostor";
import { CannonJSPlugin } from "@babylonjs/core/Physics/Plugins/cannonJSPlugin";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { float, UniversalCamera } from "@babylonjs/core";
import "@babylonjs/loaders/glTF/2.0/glTFLoader"
import "@babylonjs/core/Helpers/sceneHelpers";
import "@babylonjs/inspector"
import "@babylonjs/core/Physics/physicsEngineComponent";
import * as Cannon from "cannon";

class Game 
{ 
	private canvas: HTMLCanvasElement;
	private engine: Engine;
	private scene: Scene;
	private leftController: WebXRInputSource | null;
	private rightController: WebXRInputSource | null;
	private h1: HighlightLayer;
	private xrhelp?: WebXRDefaultExperience | null;
	private isDown: boolean;
	private minFOV: float;

	constructor()
	{
		this.canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
		this.engine = new Engine(this.canvas, true); 
		this.scene = new Scene(this.engine);
		this.leftController = null;
		this.rightController = null;
		this.h1 = new HighlightLayer("hl1", this.scene);
		this.isDown = false;
		this.minFOV = 0.5;
	}

	start(): void
	{
		this.createScene().then(() => {
			// Register a render loop to repeatedly render the scene
			this.engine.runRenderLoop(() => { 
				this.update();
				this.scene.render();
			});
			// Watch for browser/canvas resize events
			window.addEventListener("resize", () => { 
				this.engine.resize();
			});
		});
	}

	private async createScene(): Promise<void>
	{
		// This creates and positions a first-person camera (non-mesh)
		var camera = new UniversalCamera("camera", new Vector3(-32, 2, 8), this.scene);
		camera.cameraRotation = new Vector2(0,2);
		camera.fov = 90 * Math.PI / 180;
		camera.attachControl(this.canvas, true);

		// There is a bug in Babylon 4.1 that fails to enable the highlight layer on the Oculus Quest. 
		var canvasOptions = WebXRManagedOutputCanvasOptions.GetDefaults();
		canvasOptions.canvasOptions!.stencil = true;

		// Creates the XR experience helper
		const xrHelper = await this.scene.createDefaultXRExperienceAsync({outputCanvasOptions: canvasOptions});
		this.xrhelp = xrHelper;

		// Register event handler for selection events (pulling the trigger, clicking the mouse button)
		this.scene.onPointerObservable.add((pointerInfo) => {
			this.processPointer(pointerInfo);
		});

		// Register event handler when controllers are added
		xrHelper.input.onControllerAddedObservable.add ((inputSource) => {
			if (inputSource.uniqueId.endsWith ("left")) {
				this.leftController = inputSource;
			} else {
				this.rightController = inputSource;
			}
		});

		// Default env
		const environment = this.scene.createDefaultEnvironment ({
			createGround: true,
			groundSize: 200,
			skyboxSize: 750,
			skyboxColor: new Color3 (.53, .81, .92)
		});

		// Add hem light
		var light = new HemisphericLight("light", new Vector3(0,1,0), this.scene);
		light.intensity = 0.5;

		var dlight = new DirectionalLight("dlight", new Vector3(3,-1,0), this.scene);
		dlight.intensity = 0.8;

		// Load world
		var assetManager = new AssetsManager (this.scene);
		var worldTask = assetManager.addMeshTask("world task", "", "assets/", "ShowcaseScene_Sample.glb");
		worldTask.onSuccess = (task) => {
			worldTask.loadedMeshes[0].name = "world"
			worldTask.loadedMeshes.forEach ((mesh) => {
				mesh.checkCollisions = true;
			});
		}
		assetManager.load();

		// Physics
		this.scene.enablePhysics (new Vector3 (0, -9.81, 0), new CannonJSPlugin (undefined, undefined, Cannon));
		xrHelper.teleportation.addFloorMesh (environment!.ground!);
		environment!.ground!.isVisible = false;
		environment!.ground!.position = new Vector3 (0, 0, 0);
		environment!.ground!.physicsImpostor = new PhysicsImpostor (environment!.ground!, PhysicsImpostor.BoxImpostor, 
			{mass: 0, friction: 0.5, restitution: 0.7, ignoreParent: true}, this.scene);

		assetManager.onFinish = (tasks) => {
			worldTask.loadedMeshes.forEach ((mesh) => {
				if (mesh.name.startsWith("Plane")) {
					mesh.setParent (null);
					mesh.physicsImpostor = new PhysicsImpostor (mesh, PhysicsImpostor.BoxImpostor, 
						{mass: 0}, this.scene);
				} else {
					mesh.setParent (null);
					mesh.physicsImpostor = new PhysicsImpostor (mesh, PhysicsImpostor.BoxImpostor, 
						{mass: 1}, this.scene);
					mesh.physicsImpostor.sleep ();
				}
			})
			// show the debug layer
			this.scene.debugLayer.show ();
		};
	}

	// Event handler for processing pointer selection events
	private processPointer(pointerInfo: PointerInfo)
	{
		switch (pointerInfo.type) {
			case PointerEventTypes.POINTERDOWN:
				if (pointerInfo.pickInfo?.hit && pointerInfo.pickInfo.pickedMesh instanceof Mesh 
					&& pointerInfo.pickInfo.pickedMesh.name.startsWith("CowBoy")) {
					if (this.h1.hasMesh(pointerInfo.pickInfo.pickedMesh)) {
						this.h1.removeMesh(pointerInfo.pickInfo.pickedMesh);
					} else {
						this.h1.removeAllMeshes();
						this.h1.addMesh(pointerInfo.pickInfo.pickedMesh, Color3.Green());
						this.h1.innerGlow = false;
					}
				}
				break;
		}
	}

	private update (): void {
		this.processControllerInput ();

		if (this.xrhelp && this.isDown) {
			var xr = this.xrhelp;
			xr.baseExperience.camera.position = xr.baseExperience.camera.getFrontPosition(0.2);
		}
	}

	private processControllerInput (): void {
		this.onLeftTrigger(this.rightController?.motionController?.getComponent("xr-standard-trigger"));
	}

	private onLeftTrigger (component?: WebXRControllerComponent) {
		if (component?.changes.pressed) {
			if (component?.pressed) {
				this.isDown = true;
			} else {
				this.isDown = false;
			}
		}
	}


	// Event handler when controllers are added
	private onControllerAdded(controller : WebXRInputSource) {
		console.log("controller added: " + controller.pointer.name);
	}

	// Event handler when controllers are removed
	private onControllerRemoved(controller : WebXRInputSource) {
		console.log("controller removed: " + controller.pointer.name);
	}
}
/******* End of the Game class ******/   

// Start the game
var game = new Game();
game.start();
