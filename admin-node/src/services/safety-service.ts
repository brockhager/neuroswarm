class SafetyService {
  private _safeMode: boolean = false;

  public isSafe(): boolean {
    return !!this._safeMode;
  }

  public setSafeMode(enabled: boolean) {
    this._safeMode = !!enabled;
    return this._safeMode;
  }

  public getSafeMode(): boolean {
    return this._safeMode;
  }
}

export const safetyService = new SafetyService();
