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

    this.markerCluster = L.markerClusterGroup();
    this.map.addLayer(this.markerCluster);
    return this.map;
  }

  /**
   * Crée plusieurs clusters nommés (ex: {add, del, mod}), tous ajoutés à la carte.
   * @param {String[]} names
   */
  createNamedClusters(names) {
    names.forEach(name => {
      this.clusters[name] = L.markerClusterGroup({ maxClusterRadius: 50, chunkedLoading: true });
      this.map.addLayer(this.clusters[name]);
    });
    return this.clusters;
  }

  /**
   * Ajoute un marker au cluster nommé s'il existe, sinon au cluster unique par défaut.
   */
  addMarkerToCluster(marker, name = null) {
    if (name && this.clusters[name]) {
      this.clusters[name].addLayer(marker);
      return;
    }
    if (!this.markerCluster) return;
    this.markerCluster.addLayer(marker);
  }

  clearCluster(name = null) {
    if (name && this.clusters[name]) { this.clusters[name].clearLayers(); return; }
    if (this.markerCluster) this.markerCluster.clearLayers();
  }

  clearAllClusters() {
    Object.values(this.clusters).forEach(c => c.clearLayers());
    if (this.markerCluster) this.markerCluster.clearLayers();
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