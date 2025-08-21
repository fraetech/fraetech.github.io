// mapManager.js
export class MapManager {
  constructor() {
    // Map will be created once Leaflet is available
    this.map = null;
    this.markerCluster = null;
    this._initialView = [46.5, 2.5];
    this._initialZoom = 6;
  }

  createMap() {
    if (this.map) return this.map;
    this.map = L.map('map', { preferCanvas: true }).setView(this._initialView, this._initialZoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(this.map);

    this.markerCluster = L.markerClusterGroup();
    this.map.addLayer(this.markerCluster);
    return this.map;
  }

  addMarkerToCluster(marker) {
    if (!this.markerCluster) return;
    this.markerCluster.addLayer(marker);
  }

  updateMarkers(supports) {
    if (!this.markerCluster) return;
    this.markerCluster.clearLayers();
    supports.forEach(s => this.markerCluster.addLayer(s.marker));
  }

  addControls(createControlsFn) {
    // createControlsFn is a function that will add controls (SearchIcon, Search, Filter)
    if (typeof createControlsFn === 'function') createControlsFn();
  }
}