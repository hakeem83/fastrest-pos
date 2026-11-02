import React, { useMemo, useState } from 'react';
import {
  ApparelVariant,
  BusinessSpecialtyProfile,
  DeliveryDriver,
  DriverSettlementRecord,
  Employee,
  InventoryItem,
  PetFeedingCycle,
  PetProfile,
  RestaurantSettings,
  ServiceTicket,
} from '../types';
import {
  formatCurrency,
  getActiveSpecialtyProfile,
  getSpecialtyProfileLabel,
  getTodayDateString,
  StorageService,
} from '../services/storage';
import {
  AlertTriangle,
  Barcode,
  Bike,
  Calendar,
  CheckCircle2,
  ClipboardList,
  HeartHandshake,
  Layers,
  PackagePlus,
  Pill,
  Plus,
  Printer,
  Scale,
  Scissors,
  ShieldCheck,
  Shirt,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Store,
  Trash2,
  UtensilsCrossed,
  Wrench,
} from 'lucide-react';
import {
  BarcodeStickerStudio,
  ServiceTicketPrintModal,
} from './SpecialtyPrintModal';

interface Props {
  settings: RestaurantSettings;
  inventory: InventoryItem[];
  onSettingsUpdated: (newSettings: RestaurantSettings) => void;
  onRefresh: () => void;
}

export const SpecialtyOperationsHub: React.FC<Props> = ({
  settings,
  inventory,
  onSettingsUpdated,
  onRefresh,
}) => {
  const activeProfile = getActiveSpecialtyProfile(settings);

  const [subTab, setSubTab] = useState<
    | 'vertical_config'
    | 'apparel_matrix'
    | 'pet_crm'
    | 'pharmacy_expiry'
    | 'electronics_serials'
    | 'service_tickets'
    | 'delivery_fleet'
    | 'barcode_stickers'
  >(
    activeProfile === 'apparel'
      ? 'apparel_matrix'
      : activeProfile === 'pet_store'
      ? 'pet_crm'
      : activeProfile === 'pharmacy'
      ? 'pharmacy_expiry'
      : activeProfile === 'electronics'
      ? 'electronics_serials'
      : activeProfile === 'service_center' ||
        activeProfile === 'beauty_clinic' ||
        activeProfile === 'laundry'
      ? 'service_tickets'
      : 'vertical_config'
  );

  const [printingTicket, setPrintingTicket] = useState<ServiceTicket | null>(
    null
  );
  const [autoPrintNewTicket, setAutoPrintNewTicket] = useState<boolean>(true);

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Specialized Item Quick Editor State
  const [selectedItemId, setSelectedItemId] = useState<string>(
    inventory[0]?.id || ''
  );
  const selectedItem = useMemo(
    () => inventory.find((i) => i.id === selectedItemId) || inventory[0] || null,
    [inventory, selectedItemId]
  );

  const [barcode, setBarcode] = useState(selectedItem?.barcode || '');
  const [scalePlu, setScalePlu] = useState(selectedItem?.scalePluCode || '');
  const [isWeighted, setIsWeighted] = useState(
    Boolean(selectedItem?.isWeightedScaleItem)
  );
  const [packName, setPackName] = useState(selectedItem?.packUnitName || '');
  const [packFactor, setPackFactor] = useState(
    String(selectedItem?.packConversionFactor || '')
  );
  const [packPriceMajor, setPackPriceMajor] = useState(
    selectedItem?.packSalePrice ? String(selectedItem.packSalePrice / 100) : ''
  );
  const [subUnitName, setSubUnitName] = useState(
    selectedItem?.subUnitName || 'شريط'
  );
  const [subUnitsPerPack, setSubUnitsPerPack] = useState(
    String(selectedItem?.subUnitsPerPack || '')
  );
  const [activeIngredient, setActiveIngredient] = useState(
    selectedItem?.activeIngredient || ''
  );
  const [dosageInstruction, setDosageInstruction] = useState(
    selectedItem?.dosageInstruction || ''
  );
  const [expiryDate, setExpiryDate] = useState(selectedItem?.expiryDate || '');
  const [batchNumber, setBatchNumber] = useState(
    selectedItem?.batchNumber || ''
  );
  const [salePriceMajor, setSalePriceMajor] = useState(
    selectedItem?.salePrice
      ? String(selectedItem.salePrice / 100)
      : selectedItem
      ? String(selectedItem.unitCost / 100)
      : ''
  );

  // Apparel Variant Adder State
  const [varSize, setVarSize] = useState('L');
  const [varColor, setVarColor] = useState('أسود');
  const [varStock, setVarStock] = useState('5');

  // Pet Profile Form State
  const [petProfiles, setPetProfiles] = useState<PetProfile[]>(() =>
    StorageService.getPetProfiles()
  );
  const [petName, setPetName] = useState('');
  const [petSpecies, setPetSpecies] = useState<'قط' | 'كلب' | 'طائر' | 'أخرى'>(
    'قط'
  );
  const [petBreed, setPetBreed] = useState('شيرازي');
  const [petAge, setPetAge] = useState('سنة');
  const [petWeight, setPetWeight] = useState('4');
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [nextVaccine, setNextVaccine] = useState('');
  const [nextGrooming, setNextGrooming] = useState('');
  const [petNotes, setPetNotes] = useState('');

  // Pet Feeding Cycle State
  const [petFeedingCycles, setPetFeedingCycles] = useState<PetFeedingCycle[]>(() =>
    StorageService.getPetFeedingCycles()
  );
  const [feedPetId, setFeedPetId] = useState<string>('');
  const [feedFoodItemId, setFeedFoodItemId] = useState<string>('');
  const [feedBagKg, setFeedBagKg] = useState<string>('10');
  const [feedDailyGrams, setFeedDailyGrams] = useState<string>('300');

  // Delivery Fleet State
  const [deliveryDrivers, setDeliveryDrivers] = useState<DeliveryDriver[]>(() =>
    StorageService.getDeliveryDrivers()
  );
  const [driverSettlements, setDriverSettlements] = useState<DriverSettlementRecord[]>(() =>
    StorageService.getDriverSettlements()
  );

  // Electronics Serial / IMEI & Warranty State
  const [newSerialInput, setNewSerialInput] = useState('');
  const [warrantyMonthsInput, setWarrantyMonthsInput] = useState(
    String(selectedItem?.warrantyMonths || 12)
  );

  // Service Tickets / Appointments / Laundry Hub State
  const [serviceTickets, setServiceTickets] = useState<ServiceTicket[]>(() =>
    StorageService.getServiceTickets()
  );
  const [employees] = useState<Employee[]>(() => StorageService.getEmployees());
  const [ticketType, setTicketType] = useState<'repair' | 'appointment' | 'laundry'>(
    activeProfile === 'beauty_clinic'
      ? 'appointment'
      : activeProfile === 'laundry'
      ? 'laundry'
      : 'repair'
  );
  const [tktCustomerName, setTktCustomerName] = useState('');
  const [tktCustomerPhone, setTktCustomerPhone] = useState('');
  const [tktTitle, setTktTitle] = useState('');
  const [tktSerialOrTag, setTktSerialOrTag] = useState('');
  const [tktNotes, setTktNotes] = useState('');
  const [tktEmployeeId, setTktEmployeeId] = useState('');
  const [tktDate, setTktDate] = useState(getTodayDateString());
  const [tktTime, setTktTime] = useState('18:00');
  const [tktServiceFeeMajor, setTktServiceFeeMajor] = useState('350');
  const [tktDepositMajor, setTktDepositMajor] = useState('0');
  const [tktPartItemId, setTktPartItemId] = useState('');
  const [tktPackageSessions, setTktPackageSessions] = useState('0');

  const syncFormWithItem = (item: InventoryItem | null) => {
    if (!item) return;
    setBarcode(item.barcode || '');
    setScalePlu(item.scalePluCode || '');
    setIsWeighted(Boolean(item.isWeightedScaleItem));
    setPackName(item.packUnitName || '');
    setPackFactor(item.packConversionFactor ? String(item.packConversionFactor) : '');
    setPackPriceMajor(
      item.packSalePrice ? String(item.packSalePrice / 100) : ''
    );
    setSubUnitName(item.subUnitName || 'شريط');
    setSubUnitsPerPack(item.subUnitsPerPack ? String(item.subUnitsPerPack) : '');
    setActiveIngredient(item.activeIngredient || '');
    setDosageInstruction(item.dosageInstruction || '');
    setExpiryDate(item.expiryDate || '');
    setBatchNumber(item.batchNumber || '');
    setSalePriceMajor(
      String((item.salePrice || item.unitCost) / 100)
    );
    setWarrantyMonthsInput(String(item.warrantyMonths || 12));
  };

  const handleSelectSpecialty = (profile: BusinessSpecialtyProfile) => {
    const nextBusinessType = profile === 'restaurant' ? 'restaurant' : 'retail';
    const updatedSettings: RestaurantSettings = {
      ...settings,
      businessType: nextBusinessType,
      specialtyProfile: profile,
    };
    StorageService.saveSettings(updatedSettings);
    onSettingsUpdated(updatedSettings);

    if (profile === 'apparel') setSubTab('apparel_matrix');
    else if (profile === 'pet_store') setSubTab('pet_crm');
    else if (profile === 'pharmacy') setSubTab('pharmacy_expiry');
    else if (profile === 'electronics') setSubTab('electronics_serials');
    else if (
      profile === 'service_center' ||
      profile === 'beauty_clinic' ||
      profile === 'laundry'
    ) {
      setSubTab('service_tickets');
      setTicketType(
        profile === 'beauty_clinic'
          ? 'appointment'
          : profile === 'laundry'
          ? 'laundry'
          : 'repair'
      );
    } else setSubTab('vertical_config');

    setFeedback({
      type: 'success',
      message: `تم تفعيل وضع «${getSpecialtyProfileLabel(
        profile
      )}» بنجاح! تم تخصيص نقطة البيع والمخزون ليتوافق مع هذا النشاط.`,
    });
    onRefresh();
  };

  const handleLoadSpecialtyCatalogSample = (profile: BusinessSpecialtyProfile) => {
    StorageService.loadMockDemoData(profile);
    const refreshedSettings = StorageService.getSettings();
    onSettingsUpdated(refreshedSettings);
    setPetProfiles(StorageService.getPetProfiles());
    setServiceTickets(StorageService.getServiceTickets());
    const newInv = StorageService.getInventory();
    if (newInv[0]) {
      setSelectedItemId(newInv[0].id);
      syncFormWithItem(newInv[0]);
    }
    if (profile === 'electronics') setSubTab('electronics_serials');
    else if (
      profile === 'service_center' ||
      profile === 'beauty_clinic' ||
      profile === 'laundry'
    ) {
      setSubTab('service_tickets');
      setTicketType(
        profile === 'beauty_clinic'
          ? 'appointment'
          : profile === 'laundry'
          ? 'laundry'
          : 'repair'
      );
    }
    setFeedback({
      type: 'success',
      message: `تم شحن كتالوج أصناف وبيانات «${getSpecialtyProfileLabel(
        profile
      )}» بنجاح! افتح شاشة الكاشير الآن لتجربة البيع المتخصص.`,
    });
    onRefresh();
  };

  const handleSaveSpecializedItemConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    const updated = inventory.map((item) => {
      if (item.id !== selectedItem.id) return item;
      return {
        ...item,
        salePrice: Math.round((parseFloat(salePriceMajor) || 0) * 100),
        barcode: barcode.trim() || undefined,
        scalePluCode: scalePlu.trim() || undefined,
        isWeightedScaleItem: isWeighted,
        packUnitName: packName.trim() || undefined,
        packConversionFactor: parseFloat(packFactor) || undefined,
        packSalePrice: packPriceMajor
          ? Math.round(parseFloat(packPriceMajor) * 100)
          : undefined,
        subUnitName: subUnitName.trim() || undefined,
        subUnitsPerPack: parseInt(subUnitsPerPack, 10) || undefined,
        activeIngredient: activeIngredient.trim() || undefined,
        dosageInstruction: dosageInstruction.trim() || undefined,
        expiryDate: expiryDate || undefined,
        batchNumber: batchNumber.trim() || undefined,
        lastUpdated: getTodayDateString(),
      };
    });

    StorageService.saveInventory(updated);
    setFeedback({
      type: 'success',
      message: `تم حفظ الخصائص التخصصية للصنف «${selectedItem.name}» بنجاح.`,
    });
    onRefresh();
  };

  const handleAddApparelVariant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    const parsedStock = parseInt(varStock, 10) || 0;
    const currentVariants: ApparelVariant[] = selectedItem.variants || [];
    const newVar: ApparelVariant = {
      id: `var-${Date.now()}`,
      size: varSize.trim(),
      color: varColor.trim(),
      stock: parsedStock,
      barcode: `${selectedItem.code}-${varSize.trim()}-${currentVariants.length + 1}`,
    };
    const nextVariants = [...currentVariants, newVar];
    const totalVariantStock = nextVariants.reduce((s, v) => s + v.stock, 0);

    const updated = inventory.map((item) =>
      item.id === selectedItem.id
        ? {
            ...item,
            variants: nextVariants,
            currentStock: totalVariantStock,
            lastUpdated: getTodayDateString(),
          }
        : item
    );
    StorageService.saveInventory(updated);
    setFeedback({
      type: 'success',
      message: `تمت إضافة المقاس (${newVar.size} - ${newVar.color}) للموديل «${selectedItem.name}» وتحديث إجمالي الرصيد إلى ${totalVariantStock} قطعة.`,
    });
    onRefresh();
  };

  const handleRemoveVariant = (variantId: string) => {
    if (!selectedItem || !selectedItem.variants) return;
    const nextVariants = selectedItem.variants.filter((v) => v.id !== variantId);
    const totalVariantStock = nextVariants.reduce((s, v) => s + v.stock, 0);
    const updated = inventory.map((item) =>
      item.id === selectedItem.id
        ? {
            ...item,
            variants: nextVariants,
            currentStock: totalVariantStock,
          }
        : item
    );
    StorageService.saveInventory(updated);
    onRefresh();
  };

  const handleAddPetProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!petName.trim() || !ownerName.trim()) return;
    const newPet: PetProfile = {
      id: `pet-${Date.now()}`,
      code: `PET-C0${petProfiles.length + 1}`,
      petName: petName.trim(),
      species: petSpecies,
      breed: petBreed.trim(),
      ageLabel: petAge.trim(),
      weightKg: parseFloat(petWeight) || 3,
      customerName: ownerName.trim(),
      customerPhone: ownerPhone.trim(),
      nextVaccineDate: nextVaccine || undefined,
      nextGroomingDate: nextGrooming || undefined,
      medicalAndDietNotes: petNotes.trim() || undefined,
    };
    const updated = [newPet, ...petProfiles];
    StorageService.savePetProfiles(updated);
    setPetProfiles(updated);
    setPetName('');
    setOwnerName('');
    setOwnerPhone('');
    setPetNotes('');
    setFeedback({
      type: 'success',
      message: `تم تسجيل ملف الأليف «${newPet.petName}» للعميل «${newPet.customerName}» بنجاح.`,
    });
  };

  const handleDeletePetProfile = (id: string) => {
    const updated = petProfiles.filter((p) => p.id !== id);
    StorageService.savePetProfiles(updated);
    setPetProfiles(updated);
  };

  const handleAddPetFeedingCycle = (e: React.FormEvent) => {
    e.preventDefault();
    const pet = petProfiles.find((p) => p.id === feedPetId);
    const foodItem = inventory.find((i) => i.id === feedFoodItemId);
    if (!pet || !foodItem) return;

    const bagKg = parseFloat(feedBagKg) || 10;
    const dailyGrams = parseFloat(feedDailyGrams) || 300;
    const daysDuration = Math.max(1, Math.round((bagKg * 1000) / dailyGrams));

    const purchaseDate = getTodayDateString();
    const estDate = new Date();
    estDate.setDate(estDate.getDate() + daysDuration);
    const estimatedDepletionDate = estDate.toISOString().slice(0, 10);

    const newCycle: PetFeedingCycle = {
      id: `feed-${Date.now()}`,
      petProfileId: pet.id,
      petName: pet.petName,
      customerName: pet.customerName,
      customerPhone: pet.customerPhone,
      foodItemId: foodItem.id,
      foodItemName: foodItem.name,
      bagWeightKg: bagKg,
      dailyGramsEstimated: dailyGrams,
      purchaseDate,
      estimatedDepletionDate,
      reminderStatus: 'active',
    };

    const updated = [newCycle, ...petFeedingCycles];
    StorageService.savePetFeedingCycles(updated);
    setPetFeedingCycles(updated);
    setFeedback({
      type: 'success',
      message: `تم تسجيل دورة تغذية الأليف «${pet.petName}». تاريخ نفاد الشكارة التقديري: ${estimatedDepletionDate} (تكفي ${daysDuration} يوماً).`,
    });
  };

  const handleDeleteFeedingCycle = (id: string) => {
    const updated = petFeedingCycles.filter((c) => c.id !== id);
    StorageService.savePetFeedingCycles(updated);
    setPetFeedingCycles(updated);
  };

  const handleSettleDriver = (driverId: string) => {
    try {
      const drv = deliveryDrivers.find((d) => d.id === driverId);
      if (!drv || drv.cashInCustodyMinor <= 0) {
        setFeedback({
          type: 'error',
          message: 'لا توجد عهدة نقدية قائمة لهذا السائق للتصفية.',
        });
        return;
      }

      const activeShift = StorageService.getActiveShift();
      const settlement = StorageService.settleDriverShift({
        driverId,
        settledBy: activeShift?.cashierName || 'المدير العام',
        notes: 'تصفية وتوريد عهدة وردية الدليفري للخزينة',
      });

      setDeliveryDrivers(StorageService.getDeliveryDrivers());
      setDriverSettlements(StorageService.getDriverSettlements());
      setFeedback({
        type: 'success',
        message: `تمت تصفية عهدة السائق «${drv.name}» بنجاح! تم توريد صافي (${formatCurrency(settlement.netTurnedOverToSafeMinor, settings.currency)}) للخزينة الرئيسية بعد خصم عمولته (${formatCurrency(settlement.commissionEarnedMinor, settings.currency)}).`,
      });
      onRefresh();
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'حدث خطأ أثناء تصفية العهدة',
      });
    }
  };

  // --- Electronics Serial / IMEI & Warranty Handlers ---
  const handleAddSerialNumber = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !newSerialInput.trim()) return;
    const cleanSerial = newSerialInput.trim();
    const existingSerials = selectedItem.serialNumbers || [];
    if (existingSerials.includes(cleanSerial)) {
      setFeedback({
        type: 'error',
        message: `السيريال / IMEI (${cleanSerial}) مسجل بالفعل لهذا الجهاز.`,
      });
      return;
    }
    const nextSerials = [...existingSerials, cleanSerial];
    const warrantyMonths = parseInt(warrantyMonthsInput, 10) || 12;

    const updated = inventory.map((item) =>
      item.id === selectedItem.id
        ? {
            ...item,
            serialNumbers: nextSerials,
            warrantyMonths,
            currentStock: Math.max(item.currentStock, nextSerials.length),
            lastUpdated: getTodayDateString(),
          }
        : item
    );
    StorageService.saveInventory(updated);
    setNewSerialInput('');
    setFeedback({
      type: 'success',
      message: `تم تسجيل السيريال (${cleanSerial}) بضمان ${warrantyMonths} شهر للجهاز «${selectedItem.name}».`,
    });
    onRefresh();
  };

  const handleRemoveSerialNumber = (serialToRemove: string) => {
    if (!selectedItem) return;
    const nextSerials = (selectedItem.serialNumbers || []).filter(
      (s) => s !== serialToRemove
    );
    const updated = inventory.map((item) =>
      item.id === selectedItem.id
        ? {
            ...item,
            serialNumbers: nextSerials,
            lastUpdated: getTodayDateString(),
          }
        : item
    );
    StorageService.saveInventory(updated);
    onRefresh();
  };

  // --- Service Tickets / Bookings / Laundry Handlers ---
  const handleCreateServiceTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tktCustomerName.trim() || !tktTitle.trim()) return;

    const prefix =
      ticketType === 'repair'
        ? 'SRV'
        : ticketType === 'appointment'
        ? 'BKG'
        : 'LND';
    const ticketNumber = `${prefix}-${1001 + serviceTickets.length}`;
    const serviceFeeMinor = Math.round((parseFloat(tktServiceFeeMajor) || 0) * 100);
    const depositPaidMinor = Math.round((parseFloat(tktDepositMajor) || 0) * 100);

    const matchedEmp = employees.find((emp) => emp.id === tktEmployeeId);
    const matchedPart = inventory.find((inv) => inv.id === tktPartItemId);

    const partsUsed = matchedPart
      ? [
          {
            inventoryItemId: matchedPart.id,
            itemName: matchedPart.name,
            qty: 1,
            unitPriceMinor: matchedPart.salePrice || matchedPart.unitCost,
            unitCostMinor: matchedPart.unitCost,
          },
        ]
      : undefined;

    const partsTotalMinor = partsUsed
      ? partsUsed.reduce((s, p) => s + p.unitPriceMinor * p.qty, 0)
      : 0;
    const totalAmountMinor = serviceFeeMinor + partsTotalMinor;

    // Deduct spare part from inventory if used
    if (matchedPart && !matchedPart.isServiceItem) {
      const nextInv = inventory.map((inv) =>
        inv.id === matchedPart.id
          ? {
              ...inv,
              currentStock: Math.max(0, inv.currentStock - 1),
              lastUpdated: getTodayDateString(),
            }
          : inv
      );
      StorageService.saveInventory(nextInv);
    }

    const newTicket: ServiceTicket = {
      id: `tkt-${Date.now()}`,
      ticketNumber,
      ticketType,
      customerName: tktCustomerName.trim(),
      customerPhone: tktCustomerPhone.trim(),
      itemOrServiceTitle: tktTitle.trim(),
      serialOrTagNumber: tktSerialOrTag.trim() || undefined,
      problemOrNotes: tktNotes.trim() || undefined,
      assignedEmployeeId: matchedEmp?.id,
      assignedEmployeeName: matchedEmp ? matchedEmp.name : undefined,
      appointmentDate: tktDate,
      appointmentTime: tktTime,
      status: 'received',
      serviceFeeMinor,
      partsUsed,
      depositPaidMinor,
      totalAmountMinor,
      packageRemainingSessions:
        parseInt(tktPackageSessions, 10) > 0
          ? parseInt(tktPackageSessions, 10)
          : undefined,
      isSettled: false,
      createdAt: getTodayDateString(),
    };

    const updated = [newTicket, ...serviceTickets];
    StorageService.saveServiceTickets(updated);
    setServiceTickets(updated);
    setTktCustomerName('');
    setTktCustomerPhone('');
    setTktTitle('');
    setTktSerialOrTag('');
    setTktNotes('');
    setTktPartItemId('');
    setFeedback({
      type: 'success',
      message: `تم فتح التذكرة / الحجز رقم (${newTicket.ticketNumber}) للعميل «${newTicket.customerName}» بنجاح! تظهر الآن في شاشة الكاشير للتحصيل.`,
    });
    if (autoPrintNewTicket) {
      setPrintingTicket(newTicket);
    }
    onRefresh();
  };

  const handleChangeTicketStatus = (
    ticketId: string,
    nextStatus: ServiceTicket['status']
  ) => {
    StorageService.updateServiceTicketStatus(ticketId, nextStatus);
    setServiceTickets(StorageService.getServiceTickets());
    onRefresh();
  };

  const handleDeductPackageSession = (ticketId: string) => {
    const updated = serviceTickets.map((t) => {
      if (t.id !== ticketId || !t.packageRemainingSessions) return t;
      return {
        ...t,
        packageRemainingSessions: Math.max(0, t.packageRemainingSessions - 1),
      };
    });
    StorageService.saveServiceTickets(updated);
    setServiceTickets(updated);
    setFeedback({
      type: 'success',
      message: 'تم خصم جلسة من باقة العميل وتحديث الرصيد المتبقي.',
    });
  };

  const handleDeleteServiceTicket = (id: string) => {
    const updated = serviceTickets.filter((t) => t.id !== id);
    StorageService.saveServiceTickets(updated);
    setServiceTickets(updated);
  };

  const verticals: {
    id: BusinessSpecialtyProfile;
    title: string;
    subtitle: string;
    features: string[];
    icon: React.ReactNode;
  }[] = [
    {
      id: 'restaurant',
      title: 'مطعم وكافيه ومشويات',
      subtitle: 'منيو، وصفات معيارية، شاشات مطبخ، طاولات ودليفري',
      features: ['إدارة الطاولات والصالة', 'توجيه المطبخ KOT', 'حساب تكلفة الوصفة Recipe'],
      icon: <UtensilsCrossed className="w-5 h-5" />,
    },
    {
      id: 'supermarket',
      title: 'سوبر ماركت وميني ماركت',
      subtitle: 'باركود ميزان إلكتروني (21)، بيع بالقطعة والكرتونة، صلاحية',
      features: ['قراءة باركود الميزان 21', 'تعدد الوحدات (قطعة/كرتونة)', 'تنبيهات تاريخ الصلاحية'],
      icon: <Store className="w-5 h-5" />,
    },
    {
      id: 'pet_store',
      title: 'متجر وعيادة الحيوانات الأليفة',
      subtitle: 'بيع دراي فود فرط بالوزن/المبلغ، ملفات الأليف، خدمات شاور وفندقة',
      features: ['بيع فرط بالجرام أو بالمبلغ', 'سجل تطعيمات وشاور الأليف', 'خدمات Grooming وفندقة'],
      icon: <HeartHandshake className="w-5 h-5" />,
    },
    {
      id: 'apparel',
      title: 'ملابس وأحذية وأزياء',
      subtitle: 'مصفوفة المقاسات والألوان (S/M/L/XL)، استبدال سريع، مواسم',
      features: ['مصفوفة مقاسات وألوان للموديل', 'استبدال مقاس ولون فوري', 'تصنيف المواسم والأوكازيون'],
      icon: <Shirt className="w-5 h-5" />,
    },
    {
      id: 'pharmacy',
      title: 'صيدلية ومستحضرات تجميل',
      subtitle: 'بيع بالعلبة أو الشريط، بدائل المادة الفعالة، حارس تاريخ الصلاحية',
      features: ['تجزئة العلبة إلى شرائط', 'البحث بالمادة الفعالة والبدائل', 'منع بيع المنتهي الصلاحية'],
      icon: <Pill className="w-5 h-5" />,
    },
    {
      id: 'electronics',
      title: 'موبايلات وإلكترونيات وأجهزة',
      subtitle: 'تتبع الأرقام التسلسلية (IMEI / Serial) وشهادة الضمان على الفاتورة',
      features: ['تسجيل ومسح سيريال IMEI لكل جهاز', 'تحديد شهور الضمان تلقائياً', 'طباعة السيريال والضمان بالفاتورة'],
      icon: <Smartphone className="w-5 h-5" />,
    },
    {
      id: 'service_center',
      title: 'مركز صيانة وورش إصلاح',
      subtitle: 'إيصالات استلام أجهزة، تتبع حالة الإصلاح، صرف قطع غيار وعمولة فني',
      features: ['تذاكر صيانة وأوامر شغل (Job Orders)', 'خصم قطع الغيار من المخزن', 'حساب المصنعية والعربون وعمولة الفني'],
      icon: <Wrench className="w-5 h-5" />,
    },
    {
      id: 'beauty_clinic',
      title: 'بيوتي سنتر وعيادات وسبا',
      subtitle: 'حجز مواعيد الجلسات والغرف، ربط الأخصائي، وباقات الجلسات المسبقة',
      features: ['جدول مواعيد وحجوزات الجلسات', 'باقات جلسات (خصم جلسة كل زيارة)', 'ربط الخدمة بالأخصائي للعمولات'],
      icon: <Scissors className="w-5 h-5" />,
    },
    {
      id: 'laundry',
      title: 'مغسلة ودراي كلين',
      subtitle: 'تذاكر استلام ملابس برقم تاج، تحديد نوع الغسيل/الكي، وموعد التسليم',
      features: ['إيصال استلام برقم تاج وشماعة', 'غسيل / كي بخار / دراي كلين مستعجل', 'تحصيل عربون أو الدفع عند الاستلام'],
      icon: <Sparkles className="w-5 h-5" />,
    },
  ];

  const today = getTodayDateString();

  return (
    <div className="space-y-4">
      {/* Top Banner: Active Specialty Selector */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-white">
                محرك تخصيص الأنشطة التجارية المتخصصة (Vertical Specialization Engine)
              </h3>
              <span className="text-[11px] bg-amber-500 text-slate-950 font-black px-2.5 py-0.5 rounded-lg">
                النشط حالياً: {getSpecialtyProfileLabel(activeProfile)}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              اختر طبيعة نشاط المنشأة لتفعيل الأدوات التشغيلية الخاصة به في شاشة الكاشير وإدارة المخزون.
            </p>
          </div>
        </div>

        {/* 9 Vertical Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {verticals.map((v) => {
            const isSelected = activeProfile === v.id;
            return (
              <div
                key={v.id}
                className={`rounded-2xl border p-3 flex flex-col justify-between transition-all ${
                  isSelected
                    ? 'bg-amber-500/10 border-amber-500 shadow-md'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className={`p-2 rounded-xl ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {v.icon}
                    </div>
                    {isSelected && (
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-bold">
                        مُفعّل
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-black text-white mb-1">{v.title}</h4>
                  <p className="text-[10px] text-slate-400 leading-relaxed mb-2">
                    {v.subtitle}
                  </p>
                  <ul className="space-y-1 mb-3">
                    {v.features.map((f) => (
                      <li
                        key={f}
                        className="text-[10px] text-slate-300 flex items-center gap-1"
                      >
                        <span className="w-1 h-1 rounded-full bg-amber-400 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => handleSelectSpecialty(v.id)}
                    className={`w-full py-1.5 px-2 rounded-xl text-[11px] font-black transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-800 hover:bg-slate-700 text-white'
                    }`}
                  >
                    {isSelected ? 'التخصص النشط حالياً' : 'تفعيل هذا التخصص'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadSpecialtyCatalogSample(v.id)}
                    className="w-full py-1 px-2 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>شحن كتالوج تجريبي للنشاط</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-[11px] underline cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* Sub-Tabs for Specialized Operations */}
      <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 overflow-x-auto text-xs font-bold">
        <button
          type="button"
          onClick={() => setSubTab('vertical_config')}
          className={`flex items-center gap-1.5 py-2 px-3.5 rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
            subTab === 'vertical_config'
              ? 'bg-amber-500 text-slate-950 font-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>1. إعدادات الوحدات والميزان والشرائط للصنف</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('apparel_matrix')}
          className={`flex items-center gap-1.5 py-2 px-3.5 rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
            subTab === 'apparel_matrix'
              ? 'bg-amber-500 text-slate-950 font-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Shirt className="w-4 h-4" />
          <span>2. مصفوفة المقاسات والألوان (الملابس والأحذية)</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('pet_crm')}
          className={`flex items-center gap-1.5 py-2 px-3.5 rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
            subTab === 'pet_crm'
              ? 'bg-amber-500 text-slate-950 font-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <HeartHandshake className="w-4 h-4" />
          <span>3. ملفات الحيوانات الأليفة ومواعيد التطعيم والشاور ({petProfiles.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('pharmacy_expiry')}
          className={`flex items-center gap-1.5 py-2 px-3.5 rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
            subTab === 'pharmacy_expiry'
              ? 'bg-amber-500 text-slate-950 font-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Pill className="w-4 h-4" />
          <span>4. رادار الصلاحية والمادة الفعالة</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('electronics_serials')}
          className={`flex items-center gap-1.5 py-2 px-3.5 rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
            subTab === 'electronics_serials'
              ? 'bg-amber-500 text-slate-950 font-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>5. السيريال (IMEI) وشهادات الضمان (الإلكترونيات)</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('service_tickets')}
          className={`flex items-center gap-1.5 py-2 px-3.5 rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
            subTab === 'service_tickets'
              ? 'bg-amber-500 text-slate-950 font-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>
            6. تذاكر الصيانة، حجوزات البيوتي، والمغسلة ({serviceTickets.length})
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('delivery_fleet')}
          className={`flex items-center gap-1.5 py-2 px-3.5 rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
            subTab === 'delivery_fleet'
              ? 'bg-amber-500 text-slate-950 font-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Bike className="w-4 h-4" />
          <span>7. أسطول الدليفري والعهد والعمولات</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('barcode_stickers')}
          className={`flex items-center gap-1.5 py-2 px-3.5 rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
            subTab === 'barcode_stickers'
              ? 'bg-amber-500 text-slate-950 font-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Printer className="w-4 h-4" />
          <span>8. استوديو طباعة ملصقات الباركود والتسعير والسيريال</span>
        </button>
      </div>

      {/* SUB-TAB 1: SPECIALIZED ITEM CONFIGURATOR (MULTI-UNIT, SCALE PLU, BLISTER PACKS) */}
      {subTab === 'vertical_config' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-6 bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-4">
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              <Barcode className="w-4 h-4 text-amber-400" />
              <span>تخصيص خصائص البيع المتقدمة للصنف</span>
            </h4>

            <form
              onSubmit={handleSaveSpecializedItemConfig}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-slate-300 mb-1 font-bold">
                  اختر الصنف من المخزن لتخصيصه:
                </label>
                <select
                  value={selectedItem?.id || ''}
                  onChange={(e) => {
                    setSelectedItemId(e.target.value);
                    const found = inventory.find((i) => i.id === e.target.value);
                    if (found) syncFormWithItem(found);
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white"
                >
                  {inventory.map((item) => (
                    <option key={item.id} value={item.id}>
                      [{item.code}] {item.name} — الرصيد: {item.currentStock}{' '}
                      {item.unit}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">
                    سعر بيع الوحدة ({settings.currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={salePriceMajor}
                    onChange={(e) => setSalePriceMajor(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-amber-400 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">
                    باركود الصنف (Barcode)
                  </label>
                  <input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="مثال: 6221001"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">
                    كود الميزان (PLU 5 أرقام)
                  </label>
                  <input
                    type="text"
                    maxLength={5}
                    value={scalePlu}
                    onChange={(e) => setScalePlu(e.target.value)}
                    placeholder="مثال: 00101"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sky-300 font-mono"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 p-2.5 bg-slate-900 rounded-xl border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isWeighted}
                  onChange={(e) => setIsWeighted(e.target.checked)}
                  className="accent-amber-500"
                />
                <span className="font-bold text-white">
                  صنف يباع بالوزن / الفرط (يقبل أجزاء الكيلو وباركود الميزان 21 في السوبرماركت ومتجر الأليف)
                </span>
              </label>

              {/* Multi-unit Pack (Supermarket & Pet Store) */}
              <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-xl space-y-2">
                <span className="font-black text-amber-300 block">
                  إعداد العبوة الكبرى / الكرتونة / الشكارة (للسوبرماركت ومتجر الأليف):
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1">اسم العبوة الكبرى</label>
                    <input
                      type="text"
                      value={packName}
                      onChange={(e) => setPackName(e.target.value)}
                      placeholder="كرتونة / شكارة"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">
                      تحتوي على كم ({selectedItem?.unit || 'وحدة'})؟
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={packFactor}
                      onChange={(e) => setPackFactor(e.target.value)}
                      placeholder="مثال: 12 أو 20"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">
                      سعر العبوة الكبرى ({settings.currency})
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={packPriceMajor}
                      onChange={(e) => setPackPriceMajor(e.target.value)}
                      placeholder="مثال: 510"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-emerald-400 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Pharmacy Sub-unit & Active Ingredient */}
              <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-xl space-y-2">
                <span className="font-black text-sky-300 block">
                  إعداد الصيدلية (البيع بالشريط · المادة الفعالة · الصلاحية):
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1">
                      اسم الوحدة الفرعية (مثلاً: شريط)
                    </label>
                    <input
                      type="text"
                      value={subUnitName}
                      onChange={(e) => setSubUnitName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">
                      عدد الشرائط داخل العلبة الواحدة
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={subUnitsPerPack}
                      onChange={(e) => setSubUnitsPerPack(e.target.value)}
                      placeholder="مثال: 2 أو 3"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">
                      المادة الفعالة والتركيز (للبحث عن البدائل)
                    </label>
                    <input
                      type="text"
                      value={activeIngredient}
                      onChange={(e) => setActiveIngredient(e.target.value)}
                      placeholder="مثال: Paracetamol 500mg"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">
                      الجرعة الإرشادية للمريض
                    </label>
                    <input
                      type="text"
                      value={dosageInstruction}
                      onChange={(e) => setDosageInstruction(e.target.value)}
                      placeholder="قرص كل 8 ساعات بعد الأكل"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">تاريخ الصلاحية</label>
                    <input
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">
                      رقم التشغيلة (Batch No)
                    </label>
                    <input
                      type="text"
                      value={batchNumber}
                      onChange={(e) => setBatchNumber(e.target.value)}
                      placeholder="BATCH-101"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl cursor-pointer"
                >
                  حفظ الإعدادات التخصصية للصنف
                </button>
                <button
                  type="button"
                  onClick={() => setSubTab('barcode_stickers')}
                  className="py-2.5 px-3.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-bold rounded-xl cursor-pointer flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة ملصق باركود</span>
                </button>
              </div>
            </form>
          </div>

          <div className="lg:col-span-6 bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h4 className="text-sm font-black text-white">
              ملخص الأصناف المجهزة بالخصائص التخصصية ({inventory.length})
            </h4>
            <div className="overflow-x-auto max-h-[520px]">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">الصنف</th>
                    <th className="py-2.5 px-3">سعر البيع</th>
                    <th className="py-2.5 px-3">الخصائص المفعلة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {inventory.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => {
                        setSelectedItemId(item.id);
                        syncFormWithItem(item);
                      }}
                      className={`cursor-pointer transition-colors ${
                        selectedItem?.id === item.id
                          ? 'bg-amber-500/10'
                          : 'hover:bg-slate-900/50'
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-white">{item.name}</div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {item.code} {item.barcode ? `· باركود: ${item.barcode}` : ''}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-amber-400">
                        {formatCurrency(
                          item.salePrice || item.unitCost,
                          settings.currency
                        )}
                      </td>
                      <td className="py-2.5 px-3 space-y-1">
                        {item.isWeightedScaleItem && (
                          <span className="inline-block ml-1 px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 text-[10px] font-bold">
                            ميزان وبيع فرط {item.scalePluCode ? `(PLU ${item.scalePluCode})` : ''}
                          </span>
                        )}
                        {item.packUnitName && (
                          <span className="inline-block ml-1 px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 text-[10px] font-bold">
                            {item.packUnitName} ({item.packConversionFactor} {item.unit})
                          </span>
                        )}
                        {item.subUnitsPerPack && item.subUnitsPerPack > 1 && (
                          <span className="inline-block ml-1 px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 text-[10px] font-bold">
                            يباع بـ {item.subUnitName || 'شريط'} (1/{item.subUnitsPerPack})
                          </span>
                        )}
                        {item.variants && item.variants.length > 0 && (
                          <span className="inline-block ml-1 px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 text-[10px] font-bold">
                            {item.variants.length} مقاسات وألوان
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: APPAREL SIZE & COLOR MATRIX */}
      {subTab === 'apparel_matrix' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-4">
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              <Shirt className="w-4 h-4 text-amber-400" />
              <span>إضافة مقاس ولون لموديل ملابس / أحذية</span>
            </h4>

            <form onSubmit={handleAddApparelVariant} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-bold">
                  اختر الموديل:
                </label>
                <select
                  value={selectedItem?.id || ''}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white"
                >
                  {inventory.map((item) => (
                    <option key={item.id} value={item.id}>
                      [{item.code}] {item.name} — إجمالي الرصيد: {item.currentStock}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-bold">
                  المقاس (Size):
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {['S', 'M', 'L', 'XL', 'XXL', '3XL', '32', '34', '36', '41', '42', '43', '44'].map(
                    (sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setVarSize(sz)}
                        className={`px-2.5 py-1 rounded-lg font-mono font-bold cursor-pointer border ${
                          varSize === sz
                            ? 'bg-amber-500 text-slate-950 border-amber-400'
                            : 'bg-slate-900 text-slate-300 border-slate-700'
                        }`}
                      >
                        {sz}
                      </button>
                    )
                  )}
                </div>
                <input
                  type="text"
                  required
                  value={varSize}
                  onChange={(e) => setVarSize(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-bold">
                  اللون (Color):
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {['أسود', 'أبيض', 'كحلي', 'بيج', 'رمادي', 'زيتي', 'أزرق جينز'].map(
                    (clr) => (
                      <button
                        key={clr}
                        type="button"
                        onClick={() => setVarColor(clr)}
                        className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer border ${
                          varColor === clr
                            ? 'bg-sky-500 text-slate-950 border-sky-400'
                            : 'bg-slate-900 text-slate-300 border-slate-700'
                        }`}
                      >
                        {clr}
                      </button>
                    )
                  )}
                </div>
                <input
                  type="text"
                  required
                  value={varColor}
                  onChange={(e) => setVarColor(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-bold">
                  الكمية المتوفرة من هذا المقاس واللون:
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={varStock}
                  onChange={(e) => setVarStock(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة للمصفوفة وتحديث رصيد الموديل</span>
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h4 className="text-sm font-black text-white">
              مصفوفة المقاسات والألوان للموديل: «{selectedItem?.name || ''}»
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">باركود المقاس</th>
                    <th className="py-2.5 px-3">المقاس (Size)</th>
                    <th className="py-2.5 px-3">اللون (Color)</th>
                    <th className="py-2.5 px-3">الرصيد المتاح</th>
                    <th className="py-2.5 px-3 text-left">حذف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {!selectedItem?.variants || selectedItem.variants.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        لم يتم تعريف مقاسات وألوان لهذا الصنف بعد
                      </td>
                    </tr>
                  ) : (
                    selectedItem.variants.map((v) => (
                      <tr key={v.id}>
                        <td className="py-2.5 px-3 font-mono text-slate-400">
                          {v.barcode || selectedItem.code}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-black text-amber-400 text-sm">
                          {v.size}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-white">
                          {v.color}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">
                          {v.stock} قطعة
                        </td>
                        <td className="py-2.5 px-3 text-left">
                          <button
                            type="button"
                            onClick={() => handleRemoveVariant(v.id)}
                            className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: PET STORE CRM & VACCINATION / GROOMING SCHEDULE */}
      {subTab === 'pet_crm' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-4 bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              <HeartHandshake className="w-4 h-4 text-amber-400" />
              <span>تسجيل بطاقة أليف جديدة للعميل</span>
            </h4>
            <form onSubmit={handleAddPetProfile} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">
                    اسم الأليف *
                  </label>
                  <input
                    type="text"
                    required
                    value={petName}
                    onChange={(e) => setPetName(e.target.value)}
                    placeholder="مثال: بندق / ماكس"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">
                    النوع
                  </label>
                  <select
                    value={petSpecies}
                    onChange={(e) =>
                      setPetSpecies(
                        e.target.value as 'قط' | 'كلب' | 'طائر' | 'أخرى'
                      )
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="قط">قط (Cat)</option>
                    <option value="كلب">كلب (Dog)</option>
                    <option value="طائر">طائر زينة</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">
                    السلالة
                  </label>
                  <input
                    type="text"
                    value={petBreed}
                    onChange={(e) => setPetBreed(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">
                    العمر
                  </label>
                  <input
                    type="text"
                    value={petAge}
                    onChange={(e) => setPetAge(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">
                    الوزن (كجم)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={petWeight}
                    onChange={(e) => setPetWeight(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">
                    اسم المالك (العميل) *
                  </label>
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">
                    هاتف العميل
                  </label>
                  <input
                    type="text"
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">
                    موعد التطعيم القادم
                  </label>
                  <input
                    type="date"
                    value={nextVaccine}
                    onChange={(e) => setNextVaccine(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">
                    موعد الشاور والحلاقة القادم
                  </label>
                  <input
                    type="date"
                    value={nextGrooming}
                    onChange={(e) => setNextGrooming(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-bold">
                  ملاحظات الغذاء المفضل والحالة الصحية
                </label>
                <input
                  type="text"
                  value={petNotes}
                  onChange={(e) => setPetNotes(e.target.value)}
                  placeholder="نوع الدراي فود المفضل / حساسية..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl cursor-pointer"
              >
                حفظ بطاقة الأليف
              </button>
            </form>
          </div>

          <div className="lg:col-span-8 bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800">
              <h4 className="text-sm font-black text-white">
                سجل الحيوانات الأليفة ومواعيد التطعيم والشاور ({petProfiles.length})
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">الأليف والسلالة</th>
                    <th className="py-2.5 px-3">المالك والهاتف</th>
                    <th className="py-2.5 px-3">الوزن والعمر</th>
                    <th className="py-2.5 px-3">التطعيم / الشاور القادم</th>
                    <th className="py-2.5 px-3">الملاحظات الغذائية</th>
                    <th className="py-2.5 px-3 text-left">حذف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {petProfiles.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        لا توجد بطاقات مسجلة حالياً
                      </td>
                    </tr>
                  ) : (
                    petProfiles.map((pet) => (
                      <tr key={pet.id}>
                        <td className="py-2.5 px-3">
                          <div className="font-black text-amber-400">
                            {pet.petName} ({pet.species})
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {pet.breed}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-white">
                            {pet.customerName}
                          </div>
                          <div className="font-mono text-[11px] text-sky-400">
                            {pet.customerPhone}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-white">
                          {pet.weightKg} كجم · {pet.ageLabel}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px]">
                          {pet.nextVaccineDate && (
                            <div className="text-emerald-400">
                              تطعيم: {pet.nextVaccineDate}
                            </div>
                          )}
                          {pet.nextGroomingDate && (
                            <div className="text-sky-300">
                              شاور: {pet.nextGroomingDate}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-300 max-w-xs">
                          {pet.medicalAndDietNotes || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-left">
                          <button
                            type="button"
                            onClick={() => handleDeletePetProfile(pet.id)}
                            className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Auto Feeding Cycles & Recurring Reminders Section */}
            <div className="mt-4 p-4 border-t border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h5 className="text-xs font-black text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>دورة استهلاك دراي فود وتذكيرات إعادة الشراء التلقائية ({petFeedingCycles.length})</span>
                </h5>
                <span className="text-[10px] text-slate-400">
                  حساب موعد نفاد الشكارة بناءً على وزن الأليف والجرعة اليومية
                </span>
              </div>

              {/* Form to log food purchase */}
              <form onSubmit={handleAddPetFeedingCycle} className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs bg-slate-900 p-3 rounded-xl border border-slate-800">
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">الأليف:</label>
                  <select
                    value={feedPetId}
                    onChange={(e) => setFeedPetId(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-xs"
                  >
                    <option value="">اختر الأليف...</option>
                    {petProfiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.petName} ({p.customerName})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-bold">صنف الطعام / الدراي فود:</label>
                  <select
                    value={feedFoodItemId}
                    onChange={(e) => setFeedFoodItemId(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-xs"
                  >
                    <option value="">اختر الصنف من المخزن...</option>
                    {inventory.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-bold">وزن العبوة (كجم):</label>
                  <input
                    type="number"
                    step="0.5"
                    value={feedBagKg}
                    onChange={(e) => setFeedBagKg(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-bold">الاستهلاك اليومي (جرام):</label>
                  <input
                    type="number"
                    value={feedDailyGrams}
                    onChange={(e) => setFeedDailyGrams(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-mono text-xs"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full py-1.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-xs cursor-pointer"
                  >
                    + تسجيل دورة
                  </button>
                </div>
              </form>

              {/* Feeding Cycles Table */}
              {petFeedingCycles.length > 0 && (
                <div className="overflow-x-auto max-h-48 border border-slate-800 rounded-xl">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="py-2 px-3">الأليف / العميل</th>
                        <th className="py-2 px-3">صنف الطعام</th>
                        <th className="py-2 px-3">الوزن / الاستهلاك</th>
                        <th className="py-2 px-3">تاريخ الشراء</th>
                        <th className="py-2 px-3 text-amber-400">تاريخ النفاد المتوقع</th>
                        <th className="py-2 px-3">تذكير واتساب</th>
                        <th className="py-2 px-3 text-left">حذف</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {petFeedingCycles.map((c) => (
                        <tr key={c.id}>
                          <td className="py-2 px-3">
                            <div className="font-bold text-white">{c.petName}</div>
                            <div className="text-[10px] text-slate-400">{c.customerName}</div>
                          </td>
                          <td className="py-2 px-3 text-slate-200">{c.foodItemName}</td>
                          <td className="py-2 px-3 font-mono text-slate-300">
                            {c.bagWeightKg} كجم · {c.dailyGramsEstimated} جم/يوم
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-400">{c.purchaseDate}</td>
                          <td className="py-2 px-3 font-mono font-bold text-amber-400">
                            {c.estimatedDepletionDate}
                          </td>
                          <td className="py-2 px-3">
                            {c.customerPhone && (
                              <a
                                href={`https://wa.me/${c.customerPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                                  `مرحباً ${c.customerName}، من متجر ${settings.restaurantName}: طعام أليفك (${c.petName}) أوشك على الانتهاء حسب دورة التغذية المسجلة. هل ترغب في تجهيز وتوصيل شكارة جديدة (${c.foodItemName})؟`
                                )}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-[10px] inline-flex items-center gap-1"
                              >
                                تذكير واتساب 📲
                              </a>
                            )}
                          </td>
                          <td className="py-2 px-3 text-left">
                            <button
                              type="button"
                              onClick={() => handleDeleteFeedingCycle(c.id)}
                              className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: PHARMACY & SUPERMARKET EXPIRY RADAR & ACTIVE INGREDIENTS */}
      {subTab === 'pharmacy_expiry' && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-black text-white">
                رادار تواريخ الصلاحية، أرقام التشغيلات، والمادة الفعالة (FEFO & Active Ingredients)
              </h4>
              <p className="text-[11px] text-slate-400">
                يمنع النظام آلياً بيع أي صنف منتهي الصلاحية في شاشة الكاشير ويعرض البدائل التي تشترك في نفس المادة الفعالة.
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3">الكود / التشغيلة</th>
                  <th className="py-3 px-3">الصنف / الدواء</th>
                  <th className="py-3 px-3">المادة الفعالة (Active Ingredient)</th>
                  <th className="py-3 px-3">تجزئة الشرائط</th>
                  <th className="py-3 px-3">الرصيد</th>
                  <th className="py-3 px-3">تاريخ الصلاحية</th>
                  <th className="py-3 px-3">حالة الصلاحية</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {[...inventory]
                  .sort((a, b) =>
                    (a.expiryDate || '9999-12-31').localeCompare(
                      b.expiryDate || '9999-12-31'
                    )
                  )
                  .map((item) => {
                    const isExpired =
                      item.expiryDate && item.expiryDate < today;
                    return (
                      <tr key={item.id} className="hover:bg-slate-900/50">
                        <td className="py-3 px-3 font-mono text-amber-400">
                          <div>{item.code}</div>
                          {item.batchNumber && (
                            <div className="text-[10px] text-slate-400">
                              Batch: {item.batchNumber}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-white">{item.name}</div>
                          {item.dosageInstruction && (
                            <div className="text-[10px] text-sky-400">
                              الجرعة: {item.dosageInstruction}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono text-emerald-300">
                          {item.activeIngredient || '—'}
                        </td>
                        <td className="py-3 px-3 text-slate-300">
                          {item.subUnitsPerPack && item.subUnitsPerPack > 1
                            ? `${item.subUnitsPerPack} ${
                                item.subUnitName || 'شريط'
                              } بالعلبة`
                            : 'وحدة كاملة'}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-white">
                          {item.currentStock} {item.unit}
                        </td>
                        <td className="py-3 px-3 font-mono tabular-nums text-white">
                          {item.expiryDate || 'غير محدد'}
                        </td>
                        <td className="py-3 px-3">
                          {!item.expiryDate ? (
                            <span className="text-slate-500">مفتوح</span>
                          ) : isExpired ? (
                            <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold">
                              منتهي الصلاحية (موقوف بيعه)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                              صالح للبيع
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: ELECTRONICS SERIAL NUMBERS (IMEI) & WARRANTY TRACKER */}
      {subTab === 'electronics_serials' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-4">
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-amber-400" />
              <span>تسجيل سيريال (IMEI / S-N) وفترة الضمان للجهاز</span>
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              عند بيع الجهاز في شاشة الكاشير، يختار الكاشير أو يمسح رقم السيريال ليُطبع في الفاتورة كشهادة ضمان رسمية ويُخصم السيريال المباع تلقائياً من المخزن.
            </p>

            <form onSubmit={handleAddSerialNumber} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-bold">
                  اختر الجهاز أو الصنف الإلكتروني:
                </label>
                <select
                  value={selectedItem?.id || ''}
                  onChange={(e) => {
                    setSelectedItemId(e.target.value);
                    const found = inventory.find((i) => i.id === e.target.value);
                    if (found) syncFormWithItem(found);
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white"
                >
                  {inventory.map((item) => (
                    <option key={item.id} value={item.id}>
                      [{item.code}] {item.name} — الرصيد: {item.currentStock} (
                      {(item.serialNumbers || []).length} سيريال مسجل)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-bold">
                  فترة الضمان المعتمدة (بالشهور):
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[3, 6, 12, 18, 24, 36].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setWarrantyMonthsInput(String(m))}
                      className={`px-2.5 py-1 rounded-lg font-mono font-bold cursor-pointer border ${
                        Number(warrantyMonthsInput) === m
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-slate-900 text-slate-300 border-slate-700'
                      }`}
                    >
                      {m} شهر
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-bold">
                  امسح أو أدخل رقم السيريال / IMEI الجديد:
                </label>
                <input
                  type="text"
                  required
                  value={newSerialInput}
                  onChange={(e) => setNewSerialInput(e.target.value)}
                  placeholder="مثال: IMEI-359881010099887 أو SN-99412"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-amber-300 font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl cursor-pointer flex items-center justify-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>إضافة السيريال وتحديث الضمان</span>
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-white">
                الأرقام التسلسلية (IMEI) المتاحة حالياً للصنف: «{selectedItem?.name || ''}»
              </h4>
              {selectedItem?.warrantyMonths && (
                <span className="text-xs bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-xl font-bold">
                  🛡️ ضمان معتمد: {selectedItem.warrantyMonths} شهر
                </span>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">رقم السيريال / IMEI</th>
                    <th className="py-2.5 px-3">فترة الضمان</th>
                    <th className="py-2.5 px-3">الحالة</th>
                    <th className="py-2.5 px-3 text-left">حذف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {!selectedItem?.serialNumbers ||
                  selectedItem.serialNumbers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        لا توجد أرقام تسلسلية مسجلة لهذا الصنف حالياً
                      </td>
                    </tr>
                  ) : (
                    selectedItem.serialNumbers.map((sn, idx) => (
                      <tr key={sn}>
                        <td className="py-2.5 px-3 font-mono text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-black text-amber-400 text-sm">
                          {sn}
                        </td>
                        <td className="py-2.5 px-3 text-emerald-300 font-bold">
                          {selectedItem.warrantyMonths || 12} شهر من تاريخ الفاتورة
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 text-[10px] font-bold">
                            متاح بالمخزن للبيع
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-left">
                          <button
                            type="button"
                            onClick={() => handleRemoveSerialNumber(sn)}
                            className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 6: SERVICE TICKETS, BEAUTY APPOINTMENTS & LAUNDRY ORDERS HUB */}
      {subTab === 'service_tickets' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-4 bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              <Wrench className="w-4 h-4 text-amber-400" />
              <span>فتح تذكرة صيانة / حجز جلسة / استلام مغسلة</span>
            </h4>

            <form onSubmit={handleCreateServiceTicket} className="space-y-2.5 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-bold">
                  نوع التذكرة التشغيلية:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'repair', label: '🛠️ أمر صيانة' },
                    { id: 'appointment', label: '💈 حجز جلسة/باقة' },
                    { id: 'laundry', label: '🧺 استلام مغسلة' },
                  ].map((tp) => (
                    <button
                      key={tp.id}
                      type="button"
                      onClick={() =>
                        setTicketType(
                          tp.id as 'repair' | 'appointment' | 'laundry'
                        )
                      }
                      className={`py-2 px-2 rounded-xl font-bold border text-[11px] cursor-pointer ${
                        ticketType === tp.id
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                          : 'bg-slate-900 text-slate-300 border-slate-800'
                      }`}
                    >
                      {tp.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">
                    اسم العميل *
                  </label>
                  <input
                    type="text"
                    required
                    value={tktCustomerName}
                    onChange={(e) => setTktCustomerName(e.target.value)}
                    placeholder="اسم العميل..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">
                    رقم الهاتف
                  </label>
                  <input
                    type="text"
                    value={tktCustomerPhone}
                    onChange={(e) => setTktCustomerPhone(e.target.value)}
                    placeholder="010xxxxxxxx"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-bold">
                  {ticketType === 'repair'
                    ? 'موديل الجهاز المستلم ونوع الصيانة *'
                    : ticketType === 'appointment'
                    ? 'اسم الجلسة أو الباقة المحجوزة *'
                    : 'بيان الملابس والقطع المستلمة للغسيل/الكي *'}
                </label>
                <input
                  type="text"
                  required
                  value={tktTitle}
                  onChange={(e) => setTktTitle(e.target.value)}
                  placeholder={
                    ticketType === 'repair'
                      ? 'مثال: iPhone 14 Pro — تغيير بطارية أصلية'
                      : ticketType === 'appointment'
                      ? 'مثال: جلسة تنظيف بشرة هيدرافيشل'
                      : 'مثال: 2 بدلة رجالي + 3 قميص — دراي كلين'
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">
                    {ticketType === 'repair'
                      ? 'سيريال الجهاز (IMEI)'
                      : ticketType === 'appointment'
                      ? 'الغرفة / الكرسي'
                      : 'رقم التاج والشماعة (Tag)'}
                  </label>
                  <input
                    type="text"
                    value={tktSerialOrTag}
                    onChange={(e) => setTktSerialOrTag(e.target.value)}
                    placeholder={
                      ticketType === 'repair'
                        ? 'IMEI-359...'
                        : ticketType === 'appointment'
                        ? 'غرفة الليزر #1'
                        : 'TAG-501'
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sky-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">
                    الفني / الأخصائي المسؤول
                  </label>
                  <select
                    value={tktEmployeeId}
                    onChange={(e) => setTktEmployeeId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-white"
                  >
                    <option value="">— اختر من الموظفين —</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.jobTitle})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {ticketType === 'repair' && (
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">
                    قطعة غيار مسحوبة من المخزن (تُخصم آلياً وتُضاف للفاتورة):
                  </label>
                  <select
                    value={tktPartItemId}
                    onChange={(e) => setTktPartItemId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-emerald-300"
                  >
                    <option value="">— بدون قطعة غيار (مصنعية فقط) —</option>
                    {inventory
                      .filter((i) => !i.isServiceItem && i.currentStock > 0)
                      .map((part) => (
                        <option key={part.id} value={part.id}>
                          {part.name} — السعر:{' '}
                          {formatCurrency(
                            part.salePrice || part.unitCost,
                            settings.currency
                          )}{' '}
                          (متاح: {part.currentStock})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {ticketType === 'appointment' && (
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">
                    إجمالي جلسات الباقة المسبقة (0 إذا كانت جلسة فردية):
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={tktPackageSessions}
                    onChange={(e) => setTktPackageSessions(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-amber-300 font-mono"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">
                    المصنعية / رسوم الخدمة ({settings.currency})
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={tktServiceFeeMajor}
                    onChange={(e) => setTktServiceFeeMajor(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-amber-400 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">
                    العربون المدفوع مقدماً ({settings.currency})
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={tktDepositMajor}
                    onChange={(e) => setTktDepositMajor(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-emerald-400 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">
                    تاريخ الموعد / التسليم
                  </label>
                  <input
                    type="date"
                    value={tktDate}
                    onChange={(e) => setTktDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-bold">
                    الساعة
                  </label>
                  <input
                    type="time"
                    value={tktTime}
                    onChange={(e) => setTktTime(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-bold">
                  وصف العطل / ملاحظات العميل الخاصة:
                </label>
                <input
                  type="text"
                  value={tktNotes}
                  onChange={(e) => setTktNotes(e.target.value)}
                  placeholder="ملاحظات الفحص أو البقع أو الحساسية..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoPrintNewTicket}
                  onChange={(e) => setAutoPrintNewTicket(e.target.checked)}
                  className="accent-amber-500"
                />
                <span className="text-[11px] text-slate-300 font-bold">
                  فتح معاينة طباعة إيصال الاستلام / التاج تلقائياً فور الحفظ
                </span>
              </label>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl cursor-pointer flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>إصدار التذكرة وطباعة إيصال الاستلام</span>
              </button>
            </form>
          </div>

          <div className="lg:col-span-8 bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black text-white">
                  لوحة متابعة تذاكر الصيانة، حجوزات الجلسات، وأوامر المغسلة ({serviceTickets.length})
                </h4>
                <p className="text-[11px] text-slate-400">
                  التذاكر التي تصل لحالة «جاهز للتسليم» يمكن استدعاؤها بضغطة واحدة في شاشة الكاشير لتحصيل المتبقي وإصدار الفاتورة.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">رقم التذكرة</th>
                    <th className="py-2.5 px-3">العميل والخدمة / الجهاز</th>
                    <th className="py-2.5 px-3">الفني / الموعد</th>
                    <th className="py-2.5 px-3">الإجمالي والمتبقي</th>
                    <th className="py-2.5 px-3">الحالة التشغيلية</th>
                    <th className="py-2.5 px-3 text-left">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {serviceTickets.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        لا توجد تذاكر صيانة أو حجوزات أو أوامر غسيل حالياً
                      </td>
                    </tr>
                  ) : (
                    serviceTickets.map((tkt) => {
                      const remainingMinor = Math.max(
                        0,
                        tkt.totalAmountMinor - tkt.depositPaidMinor
                      );
                      return (
                        <tr key={tkt.id} className="hover:bg-slate-900/40">
                          <td className="py-2.5 px-3">
                            <span className="font-mono font-black text-amber-400 block">
                              {tkt.ticketNumber}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {tkt.ticketType === 'repair'
                                ? '🛠️ صيانة'
                                : tkt.ticketType === 'appointment'
                                ? '💈 حجز جلسة'
                                : '🧺 مغسلة'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-white">
                              {tkt.itemOrServiceTitle}
                            </div>
                            <div className="text-[11px] text-sky-300">
                              العميل: {tkt.customerName}{' '}
                              {tkt.customerPhone ? `(${tkt.customerPhone})` : ''}
                            </div>
                            {tkt.serialOrTagNumber && (
                              <div className="text-[10px] font-mono text-slate-400">
                                المعرف/التاج: {tkt.serialOrTagNumber}
                              </div>
                            )}
                            {tkt.partsUsed && tkt.partsUsed.length > 0 && (
                              <div className="text-[10px] text-emerald-300">
                                🔧 قطع غيار: {tkt.partsUsed.map((p) => p.itemName).join(' + ')}
                              </div>
                            )}
                            {tkt.packageRemainingSessions !== undefined && (
                              <div className="mt-1 flex items-center gap-1.5">
                                <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold">
                                  رصيد الباقة المتبقي: {tkt.packageRemainingSessions} جلسات
                                </span>
                                {tkt.packageRemainingSessions > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeductPackageSession(tkt.id)}
                                    className="px-2 py-0.5 bg-amber-500 text-slate-950 rounded text-[10px] font-black cursor-pointer"
                                  >
                                    - خصم جلسة اليوم
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-200">
                              {tkt.assignedEmployeeName || 'غير محدد'}
                            </div>
                            <div className="font-mono text-[10px] text-slate-400">
                              {tkt.appointmentDate} · {tkt.appointmentTime}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-mono">
                            <div className="text-white font-bold">
                              الإجمالي:{' '}
                              {formatCurrency(
                                tkt.totalAmountMinor,
                                settings.currency
                              )}
                            </div>
                            {tkt.depositPaidMinor > 0 && (
                              <div className="text-[10px] text-emerald-400">
                                عربون:{' '}
                                {formatCurrency(
                                  tkt.depositPaidMinor,
                                  settings.currency
                                )}
                              </div>
                            )}
                            <div className="text-[11px] font-black text-amber-400">
                              المتبقي:{' '}
                              {tkt.isSettled
                                ? 'خالص (مسدد)'
                                : formatCurrency(remainingMinor, settings.currency)}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <select
                              value={tkt.status}
                              onChange={(e) =>
                                handleChangeTicketStatus(
                                  tkt.id,
                                  e.target.value as ServiceTicket['status']
                                )
                              }
                              className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] font-bold text-white"
                            >
                              <option value="received">📥 مستلم بالفرع</option>
                              <option value="in_progress">⚙️ قيد التنفيذ</option>
                              <option value="ready">✅ جاهز للتسليم والتحصيل</option>
                              <option value="delivered">🏁 تم التسليم للعميل</option>
                              <option value="cancelled">❌ ملغي</option>
                            </select>
                          </td>
                          <td className="py-2.5 px-3 text-left">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setPrintingTicket(tkt)}
                                className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                title="طباعة إيصال استلام العميل أو ملصق التاج"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span>طباعة الإيصال/التاج</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteServiceTicket(tkt.id)}
                                className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"
                                title="حذف التذكرة"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 7: DELIVERY FLEET DISPATCH & CUSTODY SETTLEMENT */}
      {subTab === 'delivery_fleet' && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h4 className="text-base font-black text-white flex items-center gap-2">
                <Bike className="w-5 h-5 text-amber-400" />
                <span>تشغيل أسطول الدليفري وإدارة وتصفية العهد النقدية والعمولات</span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                متابعة عهدة كل طيار لحظياً، احتساب عمولة التوصيل، وتصفية الوردية بنقرة واحدة مع إصدار سند توريد الخزينة.
              </p>
            </div>
            <div className="text-xs bg-slate-900 border border-slate-800 text-amber-400 font-bold px-3 py-1.5 rounded-xl font-mono">
              إجمالي العهد لدى الطيارين:{' '}
              {formatCurrency(
                deliveryDrivers.reduce((s, d) => s + (d.cashInCustodyMinor || 0), 0),
                settings.currency
              )}
            </div>
          </div>

          {/* Drivers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {deliveryDrivers.map((driver) => {
              const ordersCount = driver.currentOrdersCount || 0;
              const custodyMinor = driver.cashInCustodyMinor || 0;
              const linkedEmp = employees.find(
                (e) => e.linkedDriverId === driver.id || e.id === driver.id
              );
              const perOrderComm = linkedEmp?.perDeliveryCommissionMinor || 1500;
              const estCommissionMinor = ordersCount * perOrderComm;
              const netToTurnOver = Math.max(0, custodyMinor - estCommissionMinor);

              return (
                <div
                  key={driver.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div>
                      <div className="font-black text-white text-sm">{driver.name}</div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {driver.phone || 'بدون هاتف'} · {driver.vehicleType || 'دراجة نارية'}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        driver.isActive
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {driver.isActive ? 'متاح بالفرع' : 'غير نشط'}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span>الطلبات المسلمة بالوردية:</span>
                      <span className="font-mono font-bold text-white">
                        {ordersCount} طلبات
                      </span>
                    </div>
                    <div className="flex justify-between text-amber-300 font-bold">
                      <span>العهدة النقدية المحصلة:</span>
                      <span className="font-mono">
                        {formatCurrency(custodyMinor, settings.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sky-300">
                      <span>العمولة المحسوبة للطيار:</span>
                      <span className="font-mono font-bold">
                        - {formatCurrency(estCommissionMinor, settings.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between text-emerald-400 font-black pt-1.5 border-t border-slate-800">
                      <span>الصافي المورد للخزينة:</span>
                      <span className="font-mono text-sm">
                        {formatCurrency(netToTurnOver, settings.currency)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={custodyMinor <= 0}
                      onClick={() => handleSettleDriver(driver.id)}
                      className={`w-full py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all ${
                        custodyMinor > 0
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 active:scale-95'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <span>تصفية العهدة وتوريد الصافي للخزينة</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Settlements History */}
          {driverSettlements.length > 0 && (
            <div className="border border-slate-800 rounded-xl overflow-hidden mt-4">
              <div className="bg-slate-900 px-3 py-2 text-xs font-bold text-white border-b border-slate-800">
                سجل تسويات وتوريدات عهد الدليفري ({driverSettlements.length})
              </div>
              <div className="overflow-x-auto max-h-48">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-2 px-3">رقم التسوية</th>
                      <th className="py-2 px-3">الطيار</th>
                      <th className="py-2 px-3">التاريخ والوقت</th>
                      <th className="py-2 px-3">الطلبات</th>
                      <th className="py-2 px-3 text-amber-300">المحصل</th>
                      <th className="py-2 px-3 text-sky-300">العمولة</th>
                      <th className="py-2 px-3 text-emerald-400 font-bold">المورد للخزينة</th>
                      <th className="py-2 px-3">المستلم</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {driverSettlements.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-900/40">
                        <td className="py-2 px-3 font-mono font-bold text-amber-400">
                          {s.settlementNumber}
                        </td>
                        <td className="py-2 px-3 font-bold text-white">{s.driverName}</td>
                        <td className="py-2 px-3 font-mono text-slate-400">
                          {s.date} {s.time}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-300">
                          {s.ordersDeliveredCount}
                        </td>
                        <td className="py-2 px-3 font-mono text-amber-300">
                          {formatCurrency(s.totalCollectedCashMinor, settings.currency)}
                        </td>
                        <td className="py-2 px-3 font-mono text-sky-300">
                          {formatCurrency(s.commissionEarnedMinor, settings.currency)}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-emerald-400">
                          {formatCurrency(s.netTurnedOverToSafeMinor, settings.currency)}
                        </td>
                        <td className="py-2 px-3 text-slate-300">{s.settledBy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 8: BARCODE & PRICE STICKER LABEL STUDIO */}
      {subTab === 'barcode_stickers' && (
        <BarcodeStickerStudio
          inventory={inventory}
          settings={settings}
          initialItemId={selectedItem?.id}
        />
      )}

      {/* MODAL: SERVICE TICKET / LAUNDRY TAG / APPOINTMENT RECEIPT PRINT PREVIEW */}
      {printingTicket && (
        <ServiceTicketPrintModal
          ticket={printingTicket}
          settings={settings}
          onClose={() => setPrintingTicket(null)}
        />
      )}
    </div>
  );
};
