/**
 * Real Estate Asset Update Functions
 * 
 * Functions to update real estate assets with field restrictions.
 * 
 * @module lib/real-estate/update-asset
 */

import type { Database } from '@/types/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

type RealEstateAssetUpdate = Database['public']['Tables']['real_estate_assets']['Update'];

export interface UpdateRealEstateAssetInput {
  property_nickname?: string;
  property_type?: 'residential' | 'commercial' | 'land';
  property_status?: 'ready' | 'under_construction';
  purchase_price?: number;
  purchase_date?: string;
  registration_value?: number | null;
  ownership_percentage?: number;
  city?: string;
  state?: string;
  pincode?: string;
  address?: string | null;
  project_name?: string | null;
  builder_name?: string | null;
  rera_number?: string | null;
  carpet_area_sqft?: number | null;
  builtup_area_sqft?: number | null;
  user_override_value?: number | null;
}

export interface UpdateRealEstateAssetResult {
  success: boolean;
  data?: Database['public']['Tables']['real_estate_assets']['Row'];
  error?: string;
}

/**
 * Update Real Estate Asset
 *
 * Updates allowed fields for a real estate asset:
 * - property_nickname, property_type, property_status
 * - purchase_price, purchase_date, registration_value
 * - ownership_percentage, city, state, pincode, address
 * - project_name, builder_name, rera_number
 * - carpet_area_sqft, builtup_area_sqft
 * - user_override_value
 *
 * Rules:
 * - Validates ownership before update
 * - Does NOT overwrite system_estimated_min/max
 * - updated_at is automatically updated by database trigger
 *
 * @param supabase - Supabase client (must be authenticated)
 * @param assetId - Asset ID to update
 * @param userId - User ID (must match authenticated user)
 * @param updates - Fields to update
 * @returns Updated asset
 * @throws Error if asset not found, unauthorized, or update fails
 */
export async function updateRealEstateAsset(
  supabase: SupabaseClient<Database>,
  assetId: string,
  userId: string,
  updates: UpdateRealEstateAssetInput
): Promise<Database['public']['Tables']['real_estate_assets']['Row']> {
  try {
    // Validate inputs
    if (!assetId || typeof assetId !== 'string' || assetId === 'undefined') {
      throw new Error('Invalid asset ID');
    }
    
    if (!userId || typeof userId !== 'string' || userId === 'undefined') {
      throw new Error('Invalid user ID');
    }
    
    // First, verify ownership
    const { data: existingAsset, error: fetchError } = await supabase
      .from('real_estate_assets')
      .select('id, user_id')
      .eq('id', assetId)
      .eq('user_id', userId) // Ownership validation
      .single();
    
    if (fetchError || !existingAsset) {
      if (fetchError?.code === 'PGRST116') {
        throw new Error('Asset not found or unauthorized');
      }
      throw new Error(`Failed to verify ownership: ${fetchError?.message || 'Unknown error'}`);
    }
    
    // Validate purchase_price if provided
    if (updates.purchase_price !== undefined && updates.purchase_price !== null) {
      if (typeof updates.purchase_price !== 'number' || updates.purchase_price <= 0) {
        throw new Error('Purchase price must be a positive number');
      }
    }

    // Validate purchase_date if provided
    if (updates.purchase_date !== undefined && updates.purchase_date !== null) {
      const purchaseDate = new Date(updates.purchase_date);
      if (isNaN(purchaseDate.getTime())) {
        throw new Error('Invalid purchase date format');
      }
      if (purchaseDate > new Date()) {
        throw new Error('Purchase date cannot be in the future');
      }
    }

    // Validate registration_value if provided
    if (updates.registration_value !== null && updates.registration_value !== undefined) {
      if (typeof updates.registration_value !== 'number' || updates.registration_value <= 0) {
        throw new Error('Registration value must be a positive number');
      }
    }

    // Validate ownership_percentage if provided
    if (updates.ownership_percentage !== undefined) {
      if (updates.ownership_percentage < 0 || updates.ownership_percentage > 100) {
        throw new Error('Ownership percentage must be between 0 and 100');
      }
    }

    // Validate user_override_value if provided
    if (updates.user_override_value !== null && updates.user_override_value !== undefined) {
      if (typeof updates.user_override_value !== 'number' || updates.user_override_value <= 0) {
        throw new Error('User override value must be a positive number');
      }
    }

    // Validate area fields if provided
    if (updates.carpet_area_sqft !== null && updates.carpet_area_sqft !== undefined) {
      if (updates.carpet_area_sqft <= 0) {
        throw new Error('Carpet area must be greater than 0');
      }
    }

    if (updates.builtup_area_sqft !== null && updates.builtup_area_sqft !== undefined) {
      if (updates.builtup_area_sqft <= 0) {
        throw new Error('Built-up area must be greater than 0');
      }
    }

    // Validate builtup >= carpet if both provided
    if (updates.carpet_area_sqft !== null && updates.carpet_area_sqft !== undefined &&
        updates.builtup_area_sqft !== null && updates.builtup_area_sqft !== undefined) {
      if (updates.builtup_area_sqft < updates.carpet_area_sqft) {
        throw new Error('Built-up area should be greater than or equal to carpet area');
      }
    }
    
    // Prepare update data (only allowed fields)
    const updateData: RealEstateAssetUpdate = {};

    if (updates.property_nickname !== undefined) {
      updateData.property_nickname = updates.property_nickname;
    }

    if (updates.property_type !== undefined) {
      updateData.property_type = updates.property_type;
    }

    if (updates.property_status !== undefined) {
      updateData.property_status = updates.property_status;
    }

    if (updates.purchase_price !== undefined) {
      updateData.purchase_price = updates.purchase_price;
    }

    if (updates.purchase_date !== undefined) {
      updateData.purchase_date = updates.purchase_date;
    }

    if (updates.registration_value !== undefined) {
      updateData.registration_value = updates.registration_value;
    }

    if (updates.ownership_percentage !== undefined) {
      updateData.ownership_percentage = updates.ownership_percentage;
    }

    if (updates.city !== undefined) {
      updateData.city = updates.city;
    }

    if (updates.state !== undefined) {
      updateData.state = updates.state;
    }

    if (updates.pincode !== undefined) {
      updateData.pincode = updates.pincode;
    }

    if (updates.address !== undefined) {
      updateData.address = updates.address;
    }

    if (updates.project_name !== undefined) {
      updateData.project_name = updates.project_name;
    }

    if (updates.builder_name !== undefined) {
      updateData.builder_name = updates.builder_name;
    }

    if (updates.rera_number !== undefined) {
      updateData.rera_number = updates.rera_number;
    }

    if (updates.carpet_area_sqft !== undefined) {
      updateData.carpet_area_sqft = updates.carpet_area_sqft;
    }

    if (updates.builtup_area_sqft !== undefined) {
      updateData.builtup_area_sqft = updates.builtup_area_sqft;
    }

    if (updates.user_override_value !== undefined) {
      updateData.user_override_value = updates.user_override_value;
    }
    
    // Explicitly exclude system_estimated_min/max to prevent overwriting
    // (Even if someone tries to pass them, they won't be in updateData)
    
    // Update asset (RLS ensures user can only update their own)
    // updated_at is automatically updated by database trigger
    const { data: updatedAsset, error: updateError } = await supabase
      .from('real_estate_assets')
      .update(updateData)
      .eq('id', assetId)
      .eq('user_id', userId) // Defense in depth
      .select()
      .single();
    
    if (updateError || !updatedAsset) {
      console.error('[updateRealEstateAsset] Error updating asset:', updateError);
      throw new Error(updateError?.message || 'Failed to update asset');
    }
    
    return updatedAsset;
    
  } catch (error) {
    // Re-throw with context
    if (error instanceof Error) {
      throw error;
    }
    
    console.error('[updateRealEstateAsset] Unexpected error:', error);
    throw new Error('Failed to update asset');
  }
}
