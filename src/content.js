// DockThimble — site facts used by the pages, the prerender step and the tests.
// A proposed product: pricing is illustrative; LinkedIn availability for dockthimble / dock-thimble is unconfirmed.
const site = {
  name: 'DockThimble',
  slug: 'dockthimble',
  tagline: 'Make warehouse appointments more predictable.',
  about: 'DockThimble helps warehouses schedule vehicle arrivals around realistic loading and unloading times. Machine learning predicts appointment duration from shipment size, handling needs, staffing and past turnarounds — for dock planners to confirm.',
  url: 'https://dockthimble.site',
  email: 'samuel@dockthimble.site',
  team: [
    {name: 'Samuel Akinwale', role: 'Founder', initials: 'SA', bio: 'Samuel founded DockThimble after watching yards fill with trucks booked into one-hour slots for jobs that take two — and dock teams standing idle an hour later. Samuel leads product, customers and every pilot.', focus: ['Product', 'Warehouse pilots', 'Dock operations']},
  ],
  stats: [
    {value: '39.3%', label: 'Share of stops in 2023 at which US truck drivers were detained — held beyond two hours waiting for loading or unloading.', source: 'ATRI, Costs and Consequences of Truck Driver Detention (2024)', url: 'https://truckingresearch.org/wp-content/uploads/2024/09/ATRI-Costs-and-Consequences-of-Truck-Driver-Detention-09-2024.pdf'},
    {value: '135M', label: 'Productive hours the US for-hire trucking industry lost to detention in 2023.', source: 'ATRI (2024)', url: 'https://truckingresearch.org/wp-content/uploads/2024/09/ATRI-Costs-and-Consequences-of-Truck-Driver-Detention-09-2024.pdf'},
    {value: '$11.5B', label: 'Revenue the US for-hire trucking industry lost to detention at shipper and receiver facilities in 2023.', source: 'ATRI (2024)', url: 'https://truckingresearch.org/wp-content/uploads/2024/09/ATRI-Costs-and-Consequences-of-Truck-Driver-Detention-09-2024.pdf'},
  ],
  app: {
    title: 'Dock planner',
    subtitle: 'Plan a fictional warehouse’s day: predicted turnaround times, doors and teams, queue warnings, late arrivals and turnaround reports.',
  },
};
export default site;
