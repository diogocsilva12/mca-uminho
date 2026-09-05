function dydx = exerc1(x,y)
    dydx = [y(2); -2-1/x*y(2)];
end
function res = front1(ya,yb)
    res = [ya(1); yb(1)];
end
solinit = bvpinit(linspace(0.2,0.5,4), [0 0]);
sol = bvp4c(@exerc1, @front1, solinit);
plot(sol.x, sol.y(1,:), 'r-o'); xlabel('x (uni)'); ylabel('y (uni)');
