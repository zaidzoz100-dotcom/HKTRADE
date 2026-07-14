import React from "react";
import { useListAlerts, useUpdateAlert, useDeleteAlert, getListAlertsQueryKey, AlertUpdateStatus } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Trash2, Edit2, AlertCircle, CheckCircle2, PowerOff, Bell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

export function AlertsList() {
  const queryClient = useQueryClient();
  const { data: alerts, isLoading } = useListAlerts();
  const updateAlert = useUpdateAlert();
  const deleteAlert = useDeleteAlert();

  const handleToggleStatus = (id: number, currentStatus: string) => {
    if (currentStatus !== 'active' && currentStatus !== 'disabled') return;
    
    const newStatus = currentStatus === 'active' ? AlertUpdateStatus.disabled : AlertUpdateStatus.active;
    updateAlert.mutate(
      { id, data: { status: newStatus } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAlertsQueryKey() });
        }
      }
    );
  };

  const handleDelete = (id: number) => {
    deleteAlert.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAlertsQueryKey() });
        }
      }
    );
  };

  if (isLoading) {
    return (
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Configured Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center text-muted-foreground font-mono">
            LOADING SIGNALS...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!alerts || alerts.length === 0) {
    return (
      <Card className="border-dashed border-muted">
        <CardContent className="h-48 flex flex-col items-center justify-center text-muted-foreground gap-4">
          <Bell className="h-8 w-8 opacity-20" />
          <p className="font-mono text-sm tracking-widest uppercase">No active tracking signals</p>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success" className="gap-1"><ActivityIcon /> ARMED</Badge>;
      case 'triggered':
        return <Badge variant="destructive" className="gap-1 animate-pulse"><AlertCircle className="h-3 w-3" /> TRIGGERED</Badge>;
      case 'acknowledged':
        return <Badge variant="secondary" className="gap-1"><CheckCircle2 className="h-3 w-3" /> ACKED</Badge>;
      case 'disabled':
        return <Badge variant="disabled" className="gap-1"><PowerOff className="h-3 w-3" /> OFF</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          Configured Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead>Asset</TableHead>
              <TableHead>Condition</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Note</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alerts.map((alert) => {
              const isToggleable = alert.status === 'active' || alert.status === 'disabled';
              
              return (
                <TableRow key={alert.id} className={alert.status === 'triggered' ? 'bg-destructive/10' : ''}>
                  <TableCell>
                    {getStatusBadge(alert.status)}
                  </TableCell>
                  <TableCell className="font-bold text-foreground">
                    {alert.assetSymbol}
                  </TableCell>
                  <TableCell>
                    <span className={alert.direction === 'above' ? 'text-green-500' : 'text-destructive'}>
                      {alert.direction === 'above' ? '↗ ABOVE' : '↘ BELOW'}
                    </span>
                  </TableCell>
                  <TableCell className="text-foreground">
                    {alert.targetPrice}
                  </TableCell>
                  <TableCell className="font-sans text-xs text-muted-foreground max-w-[200px] truncate" title={alert.note || ''}>
                    {alert.note || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end items-center gap-4">
                      {isToggleable && (
                        <Switch 
                          checked={alert.status === 'active'}
                          onCheckedChange={() => handleToggleStatus(alert.id, alert.status)}
                          disabled={updateAlert.isPending}
                          className="data-[state=checked]:bg-primary"
                        />
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(alert.id)}
                        disabled={deleteAlert.isPending}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ActivityIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
    </svg>
  );
}
