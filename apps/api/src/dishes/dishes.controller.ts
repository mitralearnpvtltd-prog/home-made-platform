import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { DishesService } from './dishes.service';

@Controller('kitchens/:kitchenId/dishes')
export class DishesController {
  constructor(private readonly dishesService: DishesService) {}

  @Get()
  list(@Param('kitchenId', ParseUUIDPipe) kitchenId: string) {
    return this.dishesService.listByKitchen(kitchenId);
  }

  @Get(':code')
  getOne(
    @Param('kitchenId', ParseUUIDPipe) kitchenId: string,
    @Param('code') code: string,
  ) {
    return this.dishesService.getByKitchenAndCode(kitchenId, code);
  }
}
