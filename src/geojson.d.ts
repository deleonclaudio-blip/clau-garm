declare module "*.geojson" {
  const value: {
    type: "FeatureCollection";
    features: Array<{ type: string; properties: Record<string, unknown>; geometry: any }>;
  };
  export default value;
}
