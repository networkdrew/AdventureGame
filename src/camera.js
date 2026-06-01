class Camera {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.lerpFactor = 0.1; // Smooth linear interpolation tracking
    }

    update(targetX, targetY, viewWidth, viewHeight) {
        // Center camera dynamically over target coordinates
        const targetCamX = targetX;
        const targetCamY = targetY;
        this.x += (targetCamX - this.x) * this.lerpFactor;
        this.y += (targetCamY - this.y) * this.lerpFactor;
    }
}