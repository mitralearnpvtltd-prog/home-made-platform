import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, type AuthedRequest } from '../auth/auth.guard';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
@UseGuards(AuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  createOrder(@Req() request: AuthedRequest, @Body() body: CreateOrderDto) {
    return this.ordersService.createOrder(request.authUser!.id, body);
  }

  @Get()
  listOrders(@Req() request: AuthedRequest) {
    return this.ordersService.listOrders(request.authUser!.id);
  }

  @Get(':orderId')
  getOrder(
    @Req() request: AuthedRequest,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    return this.ordersService.getOrder(request.authUser!.id, orderId);
  }

  @Delete(':orderId')
  @HttpCode(200)
  deleteOrder(
    @Req() request: AuthedRequest,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    return this.ordersService.deleteOrder(request.authUser!.id, orderId);
  }
}
