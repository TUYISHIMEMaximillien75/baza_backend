import { AppDataSource } from '../data-source';
import { Category, Location, Role } from '../entities';
import { RoleName } from '../../common/enums';

async function runSeed() {
  console.log('🌱 Starting BAZA database seeding...');
  await AppDataSource.initialize();

  // 1. Seed Roles
  const roleRepository = AppDataSource.getRepository(Role);
  const rolesToSeed = [
    { name: RoleName.USER, description: 'Standard platform buyer/renter user' },
    { name: RoleName.SELLER, description: 'Individual seller or landlord' },
    { name: RoleName.BROKER, description: 'Licensed property broker' },
    { name: RoleName.DEALER, description: 'Commercial vehicle dealership' },
    { name: RoleName.ADMIN, description: 'Platform moderator and administrator' },
    { name: RoleName.SUPER_ADMIN, description: 'Full system administrator' },
  ];

  for (const roleData of rolesToSeed) {
    let existing = await roleRepository.findOne({ where: { name: roleData.name } });
    if (!existing) {
      existing = roleRepository.create(roleData);
      await roleRepository.save(existing);
      console.log(`  [+] Created Role: ${roleData.name}`);
    }
  }

  // 2. Seed Main Categories
  const categoryRepository = AppDataSource.getRepository(Category);
  const categoriesToSeed = [
    { name: 'Property', slug: 'property', description: 'Houses, apartments, and commercial spaces for sale or rent', icon: 'building' },
    { name: 'Land', slug: 'land', description: 'Residential, agricultural, and commercial plots', icon: 'map-pin' },
    { name: 'Vehicle', slug: 'vehicle', description: 'Cars, SUVs, trucks, and motorcycles for sale or lease', icon: 'car' },
  ];

  for (const catData of categoriesToSeed) {
    let existing = await categoryRepository.findOne({ where: { slug: catData.slug } });
    if (!existing) {
      existing = categoryRepository.create(catData);
      await categoryRepository.save(existing);
      console.log(`  [+] Created Category: ${catData.name}`);
    }
  }

  // Seed Subcategories
  const propertyParent = await categoryRepository.findOne({ where: { slug: 'property' } });
  const landParent = await categoryRepository.findOne({ where: { slug: 'land' } });
  const vehicleParent = await categoryRepository.findOne({ where: { slug: 'vehicle' } });

  const subCategoriesToSeed = [
    { name: 'Houses', slug: 'houses', description: 'Single family homes and villas', parentId: propertyParent?.id, icon: 'home' },
    { name: 'Apartments', slug: 'apartments', description: 'Apartments and studio flats', parentId: propertyParent?.id, icon: 'layers' },
    { name: 'Commercial', slug: 'commercial', description: 'Office spaces, retail shops, warehouses', parentId: propertyParent?.id, icon: 'briefcase' },
    
    { name: 'Residential Land', slug: 'residential-land', description: 'Zoned residential plots', parentId: landParent?.id, icon: 'map' },
    { name: 'Agricultural Land', slug: 'agricultural-land', description: 'Farming and rural land plots', parentId: landParent?.id, icon: 'sun' },

    { name: 'Sedans & Hatchbacks', slug: 'sedans', description: 'Compact and luxury passenger cars', parentId: vehicleParent?.id, icon: 'car' },
    { name: 'SUVs & 4x4', slug: 'suvs', description: 'Off-road crossover and SUV vehicles', parentId: vehicleParent?.id, icon: 'shield' },
    { name: 'Trucks & Commercial', slug: 'trucks', description: 'Light trucks, vans, and heavy machinery', parentId: vehicleParent?.id, icon: 'truck' },
  ];

  for (const subData of subCategoriesToSeed) {
    let existing = await categoryRepository.findOne({ where: { slug: subData.slug } });
    if (!existing && subData.parentId) {
      existing = categoryRepository.create(subData);
      await categoryRepository.save(existing);
      console.log(`  [+] Created Subcategory: ${subData.name}`);
    }
  }

  // 3. Seed Sample Rwanda Locations
  const locationRepository = AppDataSource.getRepository(Location);
  const sampleLocations = [
    { province: 'Kigali City', district: 'Gasabo', sector: 'Remera', cell: 'Rukiri II', village: 'Amahoro', latitude: -1.9566, longitude: 30.1084 },
    { province: 'Kigali City', district: 'Gasabo', sector: 'Kimironko', cell: 'Kibagabaga', village: 'Nyagatovu', latitude: -1.9400, longitude: 30.1250 },
    { province: 'Kigali City', district: 'Gasabo', sector: 'Kacyiru', cell: 'Kimatironko', village: 'Kagugu', latitude: -1.9250, longitude: 30.0833 },
    { province: 'Kigali City', district: 'Kicukiro', sector: 'Kanombe', cell: 'Kabeza', village: 'Karama', latitude: -1.9680, longitude: 30.1420 },
    { province: 'Kigali City', district: 'Kicukiro', sector: 'Niboye', cell: 'Gatare', village: 'Niboye', latitude: -1.9750, longitude: 30.1000 },
    { province: 'Kigali City', district: 'Nyarugenge', sector: 'Nyamirambo', cell: 'Rwezamenyo', village: 'Biryogo', latitude: -1.9711, longitude: 30.0520 },
    { province: 'Kigali City', district: 'Nyarugenge', sector: 'Gitega', cell: 'Akabahizi', village: 'Kigarama', latitude: -1.9550, longitude: 30.0600 },
    { province: 'Northern Province', district: 'Musanze', sector: 'Muhoza', cell: 'Ruhengeri', village: 'Kigombe', latitude: -1.4989, longitude: 29.6339 },
    { province: 'Western Province', district: 'Rubavu', sector: 'Gisenyi', cell: 'Nyakiliba', village: 'Gisenyi', latitude: -1.7028, longitude: 29.2564 },
    { province: 'Southern Province', district: 'Huye', sector: 'Ngoma', cell: 'Matyazo', village: 'Butare', latitude: -2.5967, longitude: 29.7394 },
  ];

  for (const locData of sampleLocations) {
    const existing = await locationRepository.findOne({
      where: { province: locData.province, district: locData.district, sector: locData.sector, cell: locData.cell },
    });
    if (!existing) {
      const createdLoc = locationRepository.create(locData);
      await locationRepository.save(createdLoc);
      console.log(`  [+] Created Location: ${locData.province} -> ${locData.district} -> ${locData.sector}`);
    }
  }

  console.log('✅ Seeding completed successfully!');
  await AppDataSource.destroy();
}

runSeed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
