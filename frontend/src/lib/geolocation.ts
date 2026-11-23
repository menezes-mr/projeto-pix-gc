export class LocationError extends Error {}

export function getCurrentCoordinates(): Promise<{
  latitude: number;
  longitude: number;
}> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new LocationError("Localização indisponível. Acesse pelo localhost ou HTTPS e ative a localização no navegador."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (!Number.isFinite(coords.latitude) || !Number.isFinite(coords.longitude)) {
          reject(new LocationError("Não foi possível obter uma localização válida. Verifique a localização do dispositivo e tente novamente."));
          return;
        }
        resolve({ latitude: coords.latitude, longitude: coords.longitude });
      },
      (error) => {
        if (error.code === 1) {
          reject(new LocationError("Permita o acesso à localização nas configurações do navegador para confirmar o PIX."));
        } else {
          reject(new LocationError("Não foi possível obter sua localização. Ative a localização do dispositivo e tente novamente."));
        }
      },
      { timeout: 10000, maximumAge: 60000 },
    );
  });
}
