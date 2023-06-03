import * as THREE from 'three'
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader'
import VirtualScroll from 'virtual-scroll'
import { gl } from './core/WebGL'
import { Assets, loadAssets } from './utils/assetLoader'
import { qs } from '../utils'
import { mouse2d } from './utils/Mouse2D'

export class TCanvas {
  private assets: Assets = {
    model: { path: 'models/model.glb' },
    envMap: { path: 'images/pine_attic_1k.hdr' },
  }

  private model!: THREE.Group
  private rotateTarget = 0
  private scrollDirection = 1
  private rotateRatio = 1

  private isPan = false
  private isTouch = false
  private isTouchLeft = false
  private mousePosition = {
    start: { x: 0, y: 0 },
    target: { x: 0, y: 0 },
  }
  private lookAtTarget = new THREE.Vector3()

  constructor(private container: HTMLElement) {
    loadAssets(this.assets).then(() => {
      this.init()
      this.addEvents()
      this.createObjects()
      gl.requestAnimationFrame(this.anime)
    })
  }

  private init() {
    gl.setup(this.container)
    gl.scene.background = new THREE.Color('#000')
    gl.camera.position.z = 30

    gl.setResizeCallback(this.resize)
    this.resize()
  }

  private addEvents() {
    const scroller = new VirtualScroll()
    scroller.on((event) => {
      if (this.isTouch) return

      const d = this.isTouchLeft ? 1 : -1
      this.rotateTarget += d * event.deltaY * 0.015
      this.scrollDirection = d * Math.sign(event.deltaY)
      this.rotateRatio = 0.01
    })

    window.addEventListener('mousedown', () => {
      this.isPan = true
      this.mousePosition.start = { x: mouse2d.position[0], y: mouse2d.position[1] }
    })

    window.addEventListener('mouseup', () => {
      this.isPan = false
      mouse2d.clear()
    })

    qs('.touch-area').addEventListener('touchstart', (e) => {
      this.isPan = true
      this.isTouch = true
      const { pageX, pageY } = e.touches[0]
      const x = (pageX / window.innerWidth) * 2 - 1
      const y = -1 * ((pageY / window.innerHeight) * 2 - 1)
      this.mousePosition.start = { x, y }
    })

    window.addEventListener('touchstart', (e) => {
      const { pageX } = e.touches[0]
      const posX = Math.trunc((pageX / window.innerWidth) * 2)
      this.isTouchLeft = posX < 1
    })

    window.addEventListener('touchend', () => {
      this.isPan = false
      this.isTouch = false
      mouse2d.clear()
    })
  }

  private resize = () => {
    let scale = THREE.MathUtils.smoothstep(gl.size.width, 300, 1000)
    scale = scale * (1.0 - 0.7) + 0.7
    gl.scene.scale.set(scale, scale, scale)
  }

  private createObjects() {
    const model = (this.assets.model.data as GLTF).scene
    this.model = model

    const material = new THREE.MeshStandardMaterial({
      color: '#bea122',
      envMap: this.assets.envMap.data as THREE.Texture,
      envMapIntensity: 0.1,
      metalness: 1,
      roughness: 0.3,
    })

    model.children.forEach((child) => {
      const mesh = child as THREE.Mesh
      mesh.material = material
    })

    gl.scene.add(model)
  }

  // ----------------------------------
  private dummyV3 = new THREE.Vector3()

  // animation
  private anime = () => {
    // rotate
    const propeller = gl.getMesh('Propeller')
    this.rotateTarget += this.scrollDirection * gl.time.delta * 0.8
    const rot = THREE.MathUtils.lerp(propeller.rotation.z, this.rotateTarget, this.rotateRatio)
    propeller.rotation.z = rot

    // lookAt
    let lookRatio = 0.8
    if (this.isPan) {
      this.mousePosition.target = { x: mouse2d.position[0], y: mouse2d.position[1] }
    } else {
      this.mousePosition.start = { x: 0, y: 0 }
      this.mousePosition.target = { x: 0, y: 0 }
      lookRatio = 0.1
    }
    const dirX = this.mousePosition.target.x - this.mousePosition.start.x
    const dirY = this.mousePosition.target.y - this.mousePosition.start.y
    this.lookAtTarget.lerp(this.dummyV3.set(dirX * gl.size.aspect, dirY, 1).normalize(), lookRatio)
    this.model.lookAt(this.lookAtTarget)

    gl.render()
  }

  // ----------------------------------
  // dispose
  dispose() {
    gl.dispose()
  }
}
