// mapManager.js
export class MapManager {
  constructor() {
    this.map = null;
    this.markerCluster = null;     // cluster unique (usage hebdo, rétrocompatible)
    this.clusters = {};            // clusters nommés (usage mensu : add/del/mod)
    this._initialView = [46.5, 2.5];
    this._initialZoom = 6;
  }

  createMap() {
    if (this.map) return this.map;
    this.map = L.map('map', { preferCanvas: true }).setView(this._initialView, this._initialZoom);

    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>'
    });
    osmLayer.addTo(this.map);

    this.markerCluster = L.markerClusterGroup({ chunkedLoading: true });
    this.map.addLayer(this.markerCluster);
    return this.map;
  }

  /**
   * Ajoute un marker au cluster unique (le param name est ignoré —
   * mensu utilise un seul cluster, la distinction se fait via l'icône).
   */
  addMarkerToCluster(marker, name = null) {
    if (!this.markerCluster) return;
    this.markerCluster.addLayer(marker);
  }

  clearCluster() {
    if (this.markerCluster) this.markerCluster.clearLayers();
  }

  clearAllClusters() {
    this.clearCluster();
    Object.values(this.clusters).forEach(c => c.clearLayers());
  }

  updateMarkers(supports) {
    if (!this.markerCluster) return;
    this.markerCluster.clearLayers();
    supports.forEach(s => this.markerCluster.addLayer(s.marker));
  }

  addControls(createControlsFn) {
    if (typeof createControlsFn === 'function') createControlsFn();
  }
}