import apiClient from "../api/apiClient";
import { LOCATIONS_ENDPOINT } from "../api/endpoints";

export const LocationService = {
  async createLocationForCircle(
    circleId: string | number,
    data: {
      name: string;
      latitude: number;
      longitude: number;
      metadata?: object;
      isCommonLocation?: boolean;
    }
  ) {
    return await apiClient.post(LOCATIONS_ENDPOINT.CREATE_LOCATION_FOR_CIRCLE(circleId), data);
  },

  async updateLocationForCircle(
    circleId: string | number,
    locationId: string | number,
    data: {
      name?: string;
      latitude?: number;
      longitude?: number;
      metadata?: object;
      isCommonLocation?: boolean;
    }
  ) {
    return await apiClient.put(LOCATIONS_ENDPOINT.UPDATE_LOCATION_FOR_CIRCLE(circleId , locationId), data);
  },

  async assignLocation(
    circleId: string | number,
    data: {
      locationId: string;
      userId?: string;
    }
  ) {
    return await apiClient.post(LOCATIONS_ENDPOINT.ASSIGN_LOCATION(circleId), data);
  },

  async unassignLocation(
    circleId: string | number,
    data: {
      locationId: string;
      userId?: string;
    }
  ) {
    return await apiClient.post(LOCATIONS_ENDPOINT.UNASSIGN_LOCATION(circleId), data);
  },

  async deleteLocation(circleId: string | number, locationId: string | number) {
    return await apiClient.delete(LOCATIONS_ENDPOINT.DELETE_LOCATION(circleId, locationId));
  },

  async markLocationReached(
    circleId: string | number,
    data: {
      locationId: string;
      latitude: number;
      longitude: number;
    }
  ) {
    return await apiClient.post(LOCATIONS_ENDPOINT.MARK_LOCATION_REACHED(circleId), data);
  },

  async markLocationLeft(
    circleId: string | number,
    data: {
      locationId: string;
    }
  ) {
    return await apiClient.post(LOCATIONS_ENDPOINT.MARK_LOCATION_LEFT(circleId), data);
  },
};