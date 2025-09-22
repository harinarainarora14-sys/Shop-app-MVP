-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Shops policies
CREATE POLICY "Anyone can view shops" ON public.shops
  FOR SELECT USING (true);

CREATE POLICY "Shop owners can manage their shops" ON public.shops
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_type = 'shopkeeper'
      AND profiles.id = shops.owner_id
    )
  );

CREATE POLICY "Shopkeepers can create shops" ON public.shops
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_type = 'shopkeeper'
      AND profiles.id = owner_id
    )
  );

-- Categories policies (public read, admin write)
CREATE POLICY "Anyone can view categories" ON public.categories
  FOR SELECT USING (true);

-- Products policies
CREATE POLICY "Anyone can view available products" ON public.products
  FOR SELECT USING (true);

CREATE POLICY "Shop owners can manage their products" ON public.products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.shops 
      WHERE shops.id = products.shop_id 
      AND shops.owner_id = auth.uid()
    )
  );

CREATE POLICY "Shop owners can create products" ON public.products
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shops 
      WHERE shops.id = shop_id 
      AND shops.owner_id = auth.uid()
    )
  );

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Back in stock requests policies
CREATE POLICY "Users can view their own requests" ON public.back_in_stock_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own requests" ON public.back_in_stock_requests
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can create requests" ON public.back_in_stock_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Purchase journal policies
CREATE POLICY "Users can view their own purchases" ON public.purchase_journal
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own purchases" ON public.purchase_journal
  FOR INSERT WITH CHECK (auth.uid() = user_id);
