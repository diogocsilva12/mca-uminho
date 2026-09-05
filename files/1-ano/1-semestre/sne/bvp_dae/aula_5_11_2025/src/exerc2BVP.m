function dydx = exerc2(x,y)
    dydx = [y(2); (exp(-0.2*x)-y(1))/(-2)];
end
function res = front2(ya,yb)
    res = [ya(1)-1; yb(2)+yb(1)];
end
solinit = bvpinit(linspace(0,10,7), [0 0]);
sol = bvp4c(@exerc2, @front2, solinit);
%plot(sol.x, sol.y(1,:), 'r-o'); xlabel('x (uni)'); ylabel('y (uni)');
plot(sol.x, sol.y(1,:), 'r-o',sol.x, sol.y(2,:), 'b-p'); 
xlabel('x (uni)'); ylabel('y (uni)');legend('y(x)', 'y´(x)'); grid on