import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, type AuthedRequest } from '../auth/auth.guard';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Controller('cart')
@UseGuards(AuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@Req() request: AuthedRequest) {
    return this.cartService.getCart(request.authUser!.id);
  }

  @Post('items')
  addItem(@Req() request: AuthedRequest, @Body() body: AddCartItemDto) {
    return this.cartService.addItem(request.authUser!.id, body);
  }

  @Patch('items/:itemId')
  updateItem(
    @Req() request: AuthedRequest,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() body: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(request.authUser!.id, itemId, body);
  }

  @Delete('items/:itemId')
  removeItem(
    @Req() request: AuthedRequest,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    return this.cartService.removeItem(request.authUser!.id, itemId);
  }

  @Delete()
  clearCart(@Req() request: AuthedRequest) {
    return this.cartService.clearCart(request.authUser!.id);
  }
}
